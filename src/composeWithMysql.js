const debug = require("debug")("graphql-compose-mysql")
const mysql = require("mysql")
const mysqlUtilities = require("mysql-utilities")
const { Resolver, SchemaComposer, getFlatProjectionFromAST, getProjectionFromAST, clearName } = require("graphql-compose")
const DataLoader = require('dataloader')
const { printSchema } = require("graphql")
const md5 = require('md5')


module.exports = (() => {
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

    const _clearNameForType = (name) => {
        return clearName(name) + "T"
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
            const fieldName = clearName(fieldsMap[field].Field)
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

                    argsList.map(args => {
                        const statements = ns.knex(mysqlTableName)
                            .select(_buildSelectArgs(projection))
                            .where(args).toSQL().toNative()

                        selects.push(statements.sql)
                        bindings.push(statements.bindings)
                    })

                    return ns.knex
                        .raw(selects.join(";"), [].concat.apply([], bindings))
                        .then(rows => rows[0])

                } else { // argList == 1
                    return ns.knex(mysqlTableName)
                        .select(_buildSelectArgs(projection))
                        .where(argsList[0])
                        .then(rows => [rows])
                }
            }, {
                    /**
                     * How to handle the cache ?
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
            name: [clearName(mysqlTableName)],
            type: [gqlType],
            args: gqlType.getFields(),
            resolve: ({ source, args, context, info }) => {
                if (!context) {
                    throw new Error("You must provide a GraphQL context, even if empty (e.g. contextValue: {})")
                }

                /**
                 * Use a namespace specific to the current mysqlConfig to avoid collisions in context 
                 */
                const namespace = `gqlComposeMysql${md5(JSON.stringify(mysqlConfig))}`
                ns = context[namespace] = !context[namespace] ? {} : context[namespace]

                _addKnexInContext(ns, mysqlConfig)

                const projection = _buildProjectionFromInfo(info)
                const projectionHash = md5(JSON.stringify(projection))
                const loaderName = `${clearName(mysqlTableName)}${projectionHash}`
                _addDataLoaderForProjectionInContext(ns, loaderName, mysqlTableName, projection)

                return ns[loaderName].load(args)
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
                // initialize the graphql type to build from the mysql table
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

                        const foreignResolver = schemaComposer.Query.getField(clearName(foreignField.referencedTableName))

                        localTC.addRelation(
                            clearName(foreignField.referencedTableName),
                            {
                                resolver: () => foreignResolver,
                                prepareArgs: {
                                    [clearName(foreignField.referencedColumnName)]: source => {
                                        return source[clearName(foreignField.columnName)]
                                    },
                                },
                                projection: { [clearName(foreignField.columnName)]: true }
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



