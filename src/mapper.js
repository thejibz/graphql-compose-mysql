import { TypeComposer, ComposeFieldConfig } from "graphql-compose"
import type { mysqlTableT, composeWithMysqlOptsT } from "./types.mjs"

const typeMap = {
    int: "Int",
    date: "String",
    varchar: "String",
    enum: "String", // TODO: Use GraphQL Enum type
}

exports.convertToSourceTC = async (opts: composeWithMysqlOptsT = {}): Promise<TypeComposer> => {
    const tc = TypeComposer.create({
        name: `${opts.prefix || ""}${opts.graphqlTypeName}${opts.postfix || ""}`,
    })

    const fieldsMap: mysqlTableT = await retrieveTableFields(opts.mysqlClient, opts.mysqlTable)

    const fields = {}
    Object.keys(fieldsMap).forEach(field => {
        const fieldName = fieldsMap[field].Field

        fields[fieldName] = mysqlTypeToGraphQLType(fieldsMap[field].Type)
    })
    console.log(fields)
    tc.setFields(fields)

    return tc
}

function retrieveTableFields(mysqlClient, tableName) {
    return new Promise((resolve, reject) => {
        mysqlClient.fields(tableName, (err, _fields) => {
            if (err) {
                reject(err)
            }

            resolve(_fields)
        })
    })
}

function mysqlTypeToGraphQLType(mysqlType: string): ComposeFieldConfig<any, any> {
    const extractBaseType = RegExp("^(\\w+)\\W*", "g")
    const baseType = extractBaseType.exec(mysqlType)[1]

    return typeMap[baseType]
}
