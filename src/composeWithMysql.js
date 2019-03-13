"use strict"

const debug = require("debug")("graphql-compose-mysql")
const mysql = require("mysql")
const mysqlUtilities = require("mysql-utilities")
const { Resolver, SchemaComposer, getProjectionFromAST, clearName } = require("graphql-compose")
const DataLoader = require('dataloader')
const md5 = require('md5')


module.exports = (() => {
    let PREFIX = ""

    const typeMap = { // TODO: Add spatial type ???
        bigint: "Int",
        binary: "String",
        bit: "Int",
        blob: "String",
        bool: "Boolean",
        boolean: "Boolean",

        char: "String",

        date: "Date",
        datetime: "Date",

        dec: "Float",
        decimal: "Float",
        double: "Float",

        enum: "String", // TODO: Use GraphQL Enum type !

        float: "Float",

        int: "Int",
        integer: "Int",

        json: "JSON",

        longblob: "String",
        longtext: "String",

        mediumblob: "String",
        mediumint: "Int",
        mediumtext: "String",

        numeric: "Float",

        set: "String", // TODO: Use GraphQL Enum/Union type ???
        smallint: "Int",

        text: "String",
        time: "Date",
        timestamp: "Date",
        tinyblob: "String",
        tinyint: "Int",
        tinytext: "String",

        varbinary: "String",
        varchar: "String",

        year: "Int",
    }

    const _clearNameForField = (name) => {
        return `${clearName(name)}`
    }

    const _clearNameForResolver = (name) => {
        return `${PREFIX}${clearName(name)}`
    }

    const _clearNameForType = (name) => {
        return `${PREFIX}${clearName(name)}T`
    }

    const _getMysqlTablesNames = (mysqlConnection) => {
        return new Promise((resolve, reject) => {
            mysqlConnection.tables(
                (err, tables) => !!err ? reject(err) : resolve(Object.keys(tables))
            )
        })
    }

    const _getForeignFields = (mysqlConnection, mysqlTableName) => {
        return new Promise((resolve, reject) => {
            mysqlConnection.foreign(
                mysqlTableName,
                (err, foreignFields) => {
                    if (!!err)
                        reject(err)
                    else {
                        resolve(Object.values(foreignFields).map(field => {
                            return {
                                columnName: field.COLUMN_NAME,
                                referencedTableName: field.REFERENCED_TABLE_NAME,
                                referencedColumnName: field.REFERENCED_COLUMN_NAME
                            }
                        }))
                    }
                }
            )
        })
    }

    const _retrieveTableFields = (mysqlConnection, mysqlTableName) => {
        return new Promise((resolve, reject) => {
            mysqlConnection.fields(
                mysqlTableName,
                (err, fields) => !!err ? reject(err) : resolve(fields)
            )
        })
    }

    const _mysqlTypeToGqlType = (mysqlType) => {
        const extractBaseType = RegExp("^(\\w+)\\W*", "g")
        const baseType = extractBaseType.exec(mysqlType)[1]

        const gqlType = typeMap[baseType]

        if (!gqlType) {
            throw new Error(`No type mapping found for MySQL type ${mysqlType} !`)
        }

        return gqlType
    }

    const _buildGqlFieldsFromMysqlTable = async (mysqlConnection, mysqlTableName) => {
        const fieldsMap = await _retrieveTableFields(mysqlConnection, mysqlTableName)

        const fields = {}
        Object.keys(fieldsMap).forEach(field => {
            const fieldName = _clearNameForField(fieldsMap[field].Field)
            fields[fieldName] = _mysqlTypeToGqlType(fieldsMap[field].Type)
        })

        return fields
    }

    const _addKnexInContext = (ns, mysqlConfig) => {
        if (!ns.knex) { // initialize the connection pool
            ns.knex = require('knex')({
                client: "mysql",
                connection: Object.assign(mysqlConfig, { multipleStatements: true })
            })
        }
    }

    const _buildSelectArgs = (flatProjection) => {
        const selectArgs = Object.keys(flatProjection)

        return selectArgs
    }

    const _buildProjectionFromInfo = (info) => {
        const projection = Object.entries(getProjectionFromAST(info))
            // [ 'emp_no', {} ] or [ 'emp_no', true ] or [ 'departments', { dept_no: {} } ]
            // Keep only the scalar field ie. no sub-object ie. either "{}"" or "true" for value
            .filter(entry => Object.values(entry[1]).length == 0)
            .reduce((acc, entry) => Object.assign(acc, { [entry[0]]: true }), {})

        return projection
    }

    const _addDataLoaderForProjectionInContext = (ns, loaderName, mysqlTableName, projection) => {
        if (!ns[loaderName]) { // if needed, create a new dataloader for the current projection
            ns[loaderName] = new DataLoader(argsList => {
                if (argsList.length > 1) {
                    const selects = []
                    const bindings = []

                    argsList.map(_args => {
                        const limit = _args._limit
                        let { _limit, ...args } = _args

                        let statements = ns.knex(mysqlTableName)
                            .select(_buildSelectArgs(projection))
                            .where(args)

                        if (!!limit) {
                            statements.limit(limit)
                        }

                        statements = statements.toSQL().toNative()

                        selects.push(statements.sql)
                        bindings.push(statements.bindings)
                    })

                    return ns.knex
                        .raw(selects.join(";"), [].concat.apply([], bindings))
                        .then(rows => rows[0])

                } else { // argList == 1
                    const limit = argsList[0]._limit
                    let { _limit, ...args } = argsList[0]

                    let statement = ns.knex(mysqlTableName)
                        .select(_buildSelectArgs(projection))
                        .where(args)

                    if (!!limit) {
                        statement.limit(limit)
                    }

                    return statement.then(rows => [rows])
                }
            }, {
                    /**
                     * TODO: How to handle the cache ?
                     *  Should be "one query - one cache" 
                     *      but where to hook when a query end in order to clear the cache ?
                     *          the "info" object could be a way...
                     */
                    cache: false
                })
        }
    }

    const _buildResolverForGqlType = (mysqlConfig, mysqlTableName, gqlType) => {
        return new Resolver({
            name: [_clearNameForResolver(mysqlTableName)],
            type: [gqlType],
            args: Object.assign({ _limit: "Int" }, gqlType.getFields()),
            resolve: ({ source, args, context, info }) => {
                if (!context) {
                    throw new Error("You must provide a GraphQL context to the server, even if empty (e.g. contextValue: {})")
                }

                /**
                 * Use a namespace specific to the current mysqlConfig to avoid collisions in context 
                 */
                const namespace = `gqlComposeMysql${md5(JSON.stringify(mysqlConfig))}`
                context[namespace] = !context[namespace] ? {} : context[namespace]

                _addKnexInContext(context[namespace], mysqlConfig)

                const projection = _buildProjectionFromInfo(info)
                const projectionHash = md5(JSON.stringify(projection))
                const loaderName = `${_clearNameForResolver(mysqlTableName)}${projectionHash}`
                _addDataLoaderForProjectionInContext(context[namespace], loaderName, mysqlTableName, projection)

                return context[namespace][loaderName].load(args)
            }
        })
    }

    // public interfaces
    return {
        composeWithMysql: async (opts) => {
            if (!opts) {
                throw new Error("You must provide arguments when calling composeWithMysql()")
            }

            if (!opts.mysqlConfig) {
                throw new Error("You must provide a 'mysqlConfig' argument for the database.")
            }

            if (!opts.prefix) {
                opts.prefix = ""
            }

            PREFIX = Object.freeze(opts.prefix)

            // TODO optimize schema creation (use a pool instead of a single connection ?)
            const mysqlConnection = mysql.createConnection(opts.mysqlConfig)

            // Mix-in for Data Access Methods and SQL Autogenerating Methods
            mysqlUtilities.upgrade(mysqlConnection)
            // Mix-in for Introspection Methods
            mysqlUtilities.introspection(mysqlConnection)

            // initialize the graphQL schema
            const schemaComposer = new SchemaComposer()

            const mysqlTablesNames = await _getMysqlTablesNames(mysqlConnection)

            return Promise.all(mysqlTablesNames.map(async mysqlTableName => {
                // initialize the graphql type built from the mysql table
                const gqlTC = schemaComposer.TypeComposer.create({
                    name: _clearNameForType(mysqlTableName),
                })

                // add local fields
                const fields = await _buildGqlFieldsFromMysqlTable(mysqlConnection, mysqlTableName)
                gqlTC.addFields(fields)

                // add local resolver
                const resolver = _buildResolverForGqlType(opts.mysqlConfig, mysqlTableName, gqlTC)
                schemaComposer.Query.addFields({ [resolver.name]: resolver })
            })).then(_ => {
                return Promise.all(mysqlTablesNames.map(async mysqlTableName => {
                    const foreignFields = await _getForeignFields(mysqlConnection, mysqlTableName)
                    /**
                     * [ {  columnName: 'dept_no',
                            referencedTableName: 'departments',
                            referencedColumnName: 'dept_no' },
                        {   columnName: 'emp_no',
                            referencedTableName: 'employees',
                            referencedColumnName: 'emp_no' } ]
                     */

                    // add foreign fields
                    foreignFields.forEach(foreignField => {
                        const localTC = schemaComposer.get(_clearNameForType(mysqlTableName))

                        const foreignResolver = schemaComposer.Query.getField(_clearNameForResolver(foreignField.referencedTableName))

                        localTC.addRelation(
                            _clearNameForField(foreignField.referencedTableName),
                            {
                                resolver: () => foreignResolver,
                                prepareArgs: {
                                    [_clearNameForField(foreignField.referencedColumnName)]: source => {
                                        return source[_clearNameForField(foreignField.columnName)]
                                    },
                                },
                                projection: { [_clearNameForField(foreignField.columnName)]: true }
                            }
                        )
                    })
                })).then(_ => {
                    mysqlConnection.end()

                    // build the graphQL schema
                    const gqlSchema = schemaComposer.buildSchema()
                    //console.log(printSchema(gqlSchema))
                    return gqlSchema
                })
            })
        }
    }
})()



