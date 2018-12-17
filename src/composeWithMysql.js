const mysql = require("mysql")
const mysqlUtilities = require("mysql-utilities")
const { TypeComposer, SchemaComposer, getFlatProjectionFromAST, clearName } = require("graphql-compose")
const DataLoader = require('dataloader')
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

    const _getMysqlTablesNames = (mysqlConnection) => {
        return new Promise((resolve, reject) => {
            mysqlConnection.tables(
                (err, tables) => !!err ? reject(err) : resolve(Object.keys(tables))
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
            const fieldName = fieldsMap[field].Field
            fields[fieldName] = _mysqlTypeToGqlType(fieldsMap[field].Type)
        })

        return fields
    }

    const _buildSelectArgs = (flatProjection) => {
        const selectArgs = Object.keys(flatProjection).join(",")

        return selectArgs
    }

    const _addMysqlPoolInContext = (ns, mysqlConfig) => {
        if (!ns.mysqlPool) { // initialize the connection pool
            ns.mysqlPool = mysql.createPool(mysqlConfig)

            // Mix-in for Data Access Methods and SQL Autogenerating Methods
            mysqlUtilities.upgrade(ns.mysqlPool)
        }
    }

    const _addDataLoaderForProjectionInContext = (ns, loaderName, mysqlTableName, flatProjection) => {
        if (!ns[loaderName]) { // create a dataloader for the current projection
            ns[loaderName] = new DataLoader(argsList => {
                return Promise.all(argsList.map(args => {
                    // Used to keep track of running requests (to know if we can terminate the pool)
                    ns.poolCount = !ns.poolCount ? 1 : ++ns.poolCount

                    return new Promise((resolve, reject) => {
                        ns.mysqlPool.select(
                            mysqlTableName,
                            _buildSelectArgs(flatProjection),
                            args,
                            (err, results) => {
                                // request done, lets decrement the connection count
                                ns.poolCount--
                                !!err ? reject(err) : resolve(results)
                            }
                        )
                    })
                })).then(values => {
                    if (ns.poolCount === 0) {
                        // No connection running, we can terminate the pool
                        ns.mysqlPool.end()
                    }

                    return values
                })
            })
        }
    }

    const _buildResolverForGqlType = (mysqlConfig, mysqlTableName, gqlType) => {
        return {
            [clearName(mysqlTableName)]: {
                type: [gqlType],
                args: gqlType.getFields(),
                resolve: (_, args, context, info) => {
                    if (!context) {
                        throw new Error("You must provide a GraphQL context, even if empty (e.g. contextValue: {})")
                    }

                    const namespace = `gqlComposeMysql${md5(JSON.stringify(mysqlConfig))}`
                    ns = context[namespace] = !context[namespace] ? {} : context[namespace]

                    _addMysqlPoolInContext(ns, mysqlConfig)

                    const flatProjection = getFlatProjectionFromAST(info)
                    const projectionHash = md5(JSON.stringify(flatProjection))
                    const loaderName = `${clearName(mysqlTableName)}${projectionHash}`
                    _addDataLoaderForProjectionInContext(ns, loaderName, mysqlTableName, flatProjection)

                    return ns[loaderName].load(args)
                },
            }
        }
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

            const mysqlConnection = mysql.createConnection(opts.mysqlConfig)

            // Mix-in for Data Access Methods and SQL Autogenerating Methods
            mysqlUtilities.upgrade(mysqlConnection)
            // Mix-in for Introspection Methods
            mysqlUtilities.introspection(mysqlConnection)

            const schemaComposer = new SchemaComposer();

            return Promise.all((await _getMysqlTablesNames(mysqlConnection)).map(async mysqlTableName => {
                // initialize the graphql type to build
                const gqlType = TypeComposer.create({
                    name: clearName(mysqlTableName) + "T",
                })

                // add fields
                const fields = await _buildGqlFieldsFromMysqlTable(mysqlConnection, mysqlTableName)
                gqlType.addFields(fields)

                // add resolver
                const resolvers = _buildResolverForGqlType(opts.mysqlConfig, mysqlTableName, gqlType)

                schemaComposer.Query.addFields(resolvers)
            })).then( _ => {
                mysqlConnection.end()

                // build the final graphQL schema
                const gqlSchema = schemaComposer.buildSchema()
    
                return gqlSchema
            })
        }
    }
})()



