/* @flow */
import { TypeComposer } from "graphql-compose"

import type { mysqlTableT, composeWithMysqlOptsT } from "./types.mjs"

export function convertToSourceTC(opts: composeWithMysqlOptsT = {}): TypeComposer {
    if (!opts.mysqlTable || !mapping.properties) {
        throw new Error("You provide incorrect mapping. It should be an object `{ properties: {} }`")
    }
    if (!typeName || typeof typeName !== "string") {
        throw new Error("You provide empty name for type. Second argument `typeName` should be non-empty string.")
    }

    const tc = TypeComposer.create({
        name: `${opts.prefix || ""}${typeName}${opts.postfix || ""}`,
    })

    const { properties = {} } = mapping
    const fields = {}

    Object.keys(properties).forEach(sourceName => {
        const fieldName = sourceName.replace(/[^_a-zA-Z0-9]/g, "_")
        const gqType = propertyToSourceGraphQLType(properties[sourceName], `${typeName}${upperFirst(fieldName)}`, {
            ...opts,
            pluralFields: getSubFields(sourceName, pluralFields),
        })
        if (gqType) {
            if (pluralFields.indexOf(sourceName) >= 0) {
                fields[fieldName] = {
                    type: [gqType],
                    resolve: source => {
                        if (Array.isArray(source[sourceName])) {
                            return source[sourceName]
                        }
                        return [source[sourceName]]
                    },
                }
            } else {
                fields[fieldName] = {
                    type: gqType,
                    resolve: source => {
                        if (Array.isArray(source[sourceName])) {
                            return source[sourceName][0]
                        }
                        return source[sourceName]
                    },
                }
            }
        }
    })

    tc.addFields(fields)

    return tc
}
