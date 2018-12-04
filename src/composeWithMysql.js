const mysqlUtilities = require("mysql-utilities")
const { TypeComposer, schemaComposer } = require("graphql-compose")

module.exports = (() => {

    const typeMap = {
        int: "Int",
        date: "Date",
        varchar: "String",
        char: "String",
        enum: "String", // TODO: Use GraphQL Enum type
    }

    const retrieveTableFields = (mysqlClient, mysqlTable) => {
        return new Promise((resolve, reject) => {
            mysqlClient.fields(mysqlTable, (err, _fields) => {
                if (err) {
                    reject(err)
                }

                resolve(_fields)
            })
        })
    }

    const mysqlTypeToGraphQLType = (mysqlType) => {
        const extractBaseType = RegExp("^(\\w+)\\W*", "g")
        const baseType = extractBaseType.exec(mysqlType)[1]

        return typeMap[baseType]
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

    const buildResolversForGqlType = (mysqlClient, mysqlTableName, gqlType) => {
        return {
            [mysqlTableName]: {
                type: [gqlType],
                args: gqlType.getFields(),
                resolve: async (_, args) => {
                    return await new Promise((resolve, reject) => {
                        mysqlClient.select(
                            mysqlTableName,
                            "*",
                            args,
                            (err, results) => {
                                if (!!err)
                                    reject(err)
                                resolve(results)
                            })
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

            if (!opts.graphqlTypeName || typeof opts.graphqlTypeName !== "string") {
                throw new Error("Opts.graphqlTypeName is required property for generated GraphQL Type name in composeWithMysql()")
            }

            if (!opts.mysqlClient) {
                throw new Error("You must provide a mysqlClient connected to the database.")
            }

            if (!opts.mysqlTable) {
                throw new Error("You must provide the mysqlTable that you want to access.")
            }

            if (!opts.prefix) {
                opts.prefix = "" // eslint-disable-line
            }

            // Mix-in for Data Access Methods and SQL Autogenerating Methods
            mysqlUtilities.upgrade(opts.mysqlClient)
            // Mix-in for Introspection Methods
            mysqlUtilities.introspection(opts.mysqlClient)

            // initialize the new graphql type
            const gqlType = TypeComposer.create({
                name: `${opts.prefix || ""}${opts.graphqlTypeName}${opts.postfix || ""}`,
            })

            // add fields
            const fields = await buildGqlFieldsFromMysqlTable(opts.mysqlClient, opts.mysqlTable)
            gqlType.addFields(fields)

            // add resolvers
            const resolvers = buildResolversForGqlType(opts.mysqlClient, opts.mysqlTable, gqlType)
            schemaComposer.Query.addFields(resolvers)

            // build the final schema
            const gqlSchema = schemaComposer.buildSchema()

            return gqlSchema
        }
    }
})


