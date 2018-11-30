/* @flow */

import graphqlcompose from "graphql-compose"
import type { mysqlTableT, composeWithMysqlOptsT } from "./types.mjs"

const { TypeComposer } = graphqlcompose

export const typeMap = {
    int: "Int",
    date: "String",
    varchar: "String",
    enum: "String", // TODO: Use GraphQL Enum type
}

export async function convertToSourceTC(opts: composeWithMysqlOptsT = {}): TypeComposer {
    const tc = TypeComposer.create({
        name: `${opts.prefix || ""}${opts.graphqlTypeName}${opts.postfix || ""}`,
    })

    const fieldsMap: mysqlTableT = await new Promise((resolve, reject) => {
        opts.mysqlClient.fields("employees", (err, _fields) => {
            if (err) {
                reject(err)
            }

            resolve(_fields)
        })
    })
    console.log(fieldsMap)
    const fields = {}
    Object.keys(fieldsMap).forEach(field => {
        const fieldName = fieldsMap[field].Field
        const gqlType = mysqlTypeToGraphQLTypes(fieldsMap[field].Type)

        fields[fieldName] = {
            type: gqlType,
        }
    })

    tc.addFields(fields)
    console.log(tc)

    return tc
}

export function mysqlTypeToGraphQLTypes(mysqlType: string): string {
    const extractBaseType = RegExp("^(\\w+)\\W*", "g")
    const baseType = extractBaseType.exec(mysqlType)[1]

    return typeMap[baseType]
}
