const mysql = require("mysql")
const mysqlUtilities = require("mysql-utilities")
const { TypeComposer, SchemaComposer, getFlatProjectionFromAST, clearName } = require("graphql-compose")
const DataLoader = require('dataloader')

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

    const _retrieveTableFields = (mysqlConfig, mysqlTableName) => {
        return new Promise((resolve, reject) => {
            const mysqlConnection = mysql.createConnection(mysqlConfig)

            // Mix-in for Data Access Methods and SQL Autogenerating Methods
            mysqlUtilities.upgrade(mysqlConnection)
            // Mix-in for Introspection Methods
            mysqlUtilities.introspection(mysqlConnection)

            mysqlConnection.fields(
                mysqlTableName,
                (err, fields) => !!err ? reject(err) : resolve(fields)
            )

            mysqlConnection.end()
        })
    }

    const _mysqlTypeToGraphQLType = (mysqlType) => {
        const extractBaseType = RegExp("^(\\w+)\\W*", "g")
        const baseType = extractBaseType.exec(mysqlType)[1]

        const gqlType = typeMap[baseType]

        if (!gqlType) {
            throw new Error(`No type mapping found for MySQL type ${mysqlType} !`)
        }

        return gqlType
    }

    const _buildGqlFieldsFromMysqlTable = async (mysqlConfig, mysqlTableName) => {
        const fieldsMap = await _retrieveTableFields(mysqlConfig, mysqlTableName)

        const fields = {}
        Object.keys(fieldsMap).forEach(field => {
            const fieldName = fieldsMap[field].Field
            fields[fieldName] = _mysqlTypeToGraphQLType(fieldsMap[field].Type)
        })

        return fields
    }

    const _buildSelectArgs = (flatProjection) => {
        const selectArgs = Object.keys(flatProjection).join(",")

        return selectArgs
    }

    const _buildResolversForGqlType = (mysqlConfig, mysqlTableName, gqlType) => {




        return {
            [clearName(mysqlTableName)]: {
                type: [gqlType],
                args: gqlType.getFields(),
                resolve: async (_, args, context, info) => {
                    context = !context ? {} : context
                    const flatProjection = getFlatProjectionFromAST(info)
                    // A, B
                    // A, B
                    // A, B
                    // A, B, D
                    // B, D
                    // get hash of the projection and then add it to the loader name
                    // in order to have a unique Loader per Projection
                    // args ("where" arguments) will be the variable part
                    // Are we sure ? what if the args are the same but the projection is different ?
                    // Maybe a loader is identified by Projection AND Args ???
                    
                    if (!context[`${clearName(mysqlTableName)}Loader`]) {
                        if (!context.mysqlPool) { // initialize the connection pool
                            context.mysqlPool = mysql.createPool(mysqlConfig)

                            // Mix-in for Data Access Methods and SQL Autogenerating Methods
                            mysqlUtilities.upgrade(context.mysqlPool)
                        }

                        context[`${clearName(mysqlTableName)}Loader`] = (args) => {
                            
                            context.mysqlPool.select(
                                mysqlTableName,
                                _buildSelectArgs(projections),
                                args,
                                (err, results) => {
                                    !!err ? reject(err) : resolve(results)
                                }
                            )
                        }
                    }



                    return await new Promise((resolve, reject) => {



                    })
                },
            }
        }
    }

    // public interfaces
    return {
        composeWithMysql: async (opts) => {
            if (!opts) {
                throw new Error("Opts is required argument for composeWithMysql()")
            }

            if (!opts.graphqlTypeName || typeof opts.graphqlTypeName !== "string" || clearName(opts.graphqlTypeName) != opts.graphqlTypeName) {
                throw new Error("You must provide a valid (pattern: _a-zA-Z0-9) 'graphqlTypeName'.")
            }

            if (!opts.mysqlConfig) {
                throw new Error("You must provide a 'mysqlConfig' for the database.")
            }

            if (!opts.mysqlTableName) {
                throw new Error("You must provide the 'mysqlTableName' that you want to access.")
            }

            // initialize the graphql type to build
            const graphqlTypeName = clearName(opts.graphqlTypeName)
            const gqlType = TypeComposer.create({
                name: graphqlTypeName,
            })

            // add fields
            const fields = await _buildGqlFieldsFromMysqlTable(opts.mysqlConfig, opts.mysqlTableName)
            gqlType.addFields(fields)

            // add resolvers
            const resolvers = _buildResolversForGqlType(opts.mysqlConfig, opts.mysqlTableName, gqlType)
            const schemaComposer = new SchemaComposer()
            schemaComposer.Query.addFields(resolvers)

            // build the final graphQL schema
            const gqlSchema = schemaComposer.buildSchema()

            return gqlSchema
        }
    }
})()



