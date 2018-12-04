const { TypeComposer } = require("graphql-compose")

const typeMap = {
    int: "Int",
    date: "String",
    varchar: "String",
    enum: "String", // TODO: Use GraphQL Enum type
}

exports.convertToSourceTC = async (opts = {}) => {
    const tc = TypeComposer.create({
        name: `${opts.prefix || ""}${opts.graphqlTypeName}${opts.postfix || ""}`,
    })

    const fieldsMap = await retrieveTableFields(opts.mysqlClient, opts.mysqlTable)

    const fields = {}
    Object.keys(fieldsMap).forEach(field => {
        const fieldName = fieldsMap[field].Field

        fields[fieldName] = mysqlTypeToGraphQLType(fieldsMap[field].Type)
    })
    console.log(tc)
    
    tc.addFields(fields)

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

function mysqlTypeToGraphQLType(mysqlType) {
    const extractBaseType = RegExp("^(\\w+)\\W*", "g")
    const baseType = extractBaseType.exec(mysqlType)[1]

    return typeMap[baseType]
}
