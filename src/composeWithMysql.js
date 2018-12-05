const mysqlUtilities = require("mysql-utilities")
const { TypeComposer, SchemaComposer, getFlatProjectionFromAST, clearName } = require("graphql-compose")

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

    const retrieveTableFields = (mysqlClient, mysqlTable) => {
        return new Promise((resolve, reject) => {
            mysqlClient.fields(
                mysqlTable, 
                (err, fields) => !!err ? reject(err) : resolve(fields)
            )
        })
    }

    const mysqlTypeToGraphQLType = (mysqlType) => {
        const extractBaseType = RegExp("^(\\w+)\\W*", "g")
        const baseType = extractBaseType.exec(mysqlType)[1]

        const gqlType = typeMap[baseType]

        if (!gqlType) {
            throw new Error(`No type mapping found for MySQL type ${mysqlType} !`)
        }

        return gqlType
    }

    const buildGqlFieldsFromMysqlTable = async (mysqlClient, mysqlTableName) => {
        const fieldsMap = await retrieveTableFields(mysqlClient, mysqlTableName)

        const fields = {}
        Object.keys(fieldsMap).forEach(field => {
            const fieldName = fieldsMap[field].Field
            fields[fieldName] = mysqlTypeToGraphQLType(fieldsMap[field].Type)
        })

        return fields
    }

    const buildSelectArgs = (flatProjection) => {
        const selectArgs = Object.keys(flatProjection).join(",")

        return selectArgs
    }

    const buildResolversForGqlType = (mysqlClient, mysqlTableName, gqlType) => {
        return {
            [clearName(mysqlTableName)]: {
                type: [gqlType],
                args: gqlType.getFields(),
                resolve: async (_, args, __, info) => {
                    const flatProjection = getFlatProjectionFromAST(info)
                    return await new Promise((resolve, reject) => {
                        mysqlClient.select(
                            mysqlTableName,
                            buildSelectArgs(flatProjection),
                            args,
                            (err, results) => !!err ? reject(err) : resolve(results)
                        )
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

            if (!opts.mysqlClient) {
                throw new Error("You must provide a 'mysqlClient' connected to the database.")
            }

            if (!opts.mysqlTableName) {
                throw new Error("You must provide the 'mysqlTableName' that you want to access.")
            }

            // Mix-in for Data Access Methods and SQL Autogenerating Methods
            mysqlUtilities.upgrade(opts.mysqlClient)
            // Mix-in for Introspection Methods
            mysqlUtilities.introspection(opts.mysqlClient)

            // initialize the graphql type to build
            const graphqlTypeName = clearName(opts.graphqlTypeName)
            const gqlType = TypeComposer.create({
                name: graphqlTypeName,
            })

            // add fields
            const fields = await buildGqlFieldsFromMysqlTable(opts.mysqlClient, opts.mysqlTableName)
            gqlType.addFields(fields)

            // add resolvers
            const resolvers = buildResolversForGqlType(opts.mysqlClient, opts.mysqlTableName, gqlType)
            const schemaComposer = new SchemaComposer()
            schemaComposer.Query.addFields(resolvers)

            // build the final graphQL schema
            const gqlSchema = schemaComposer.buildSchema()

            return gqlSchema
        }
    }
})


