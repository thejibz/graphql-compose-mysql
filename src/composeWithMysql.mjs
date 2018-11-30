/* @flow */

import graphqlcompose from "graphql-compose"
import mysqlUtilities from "mysql-utilities"

import { convertToSourceTC } from "./mapper.mjs"

const { TypeComposer } = graphqlcompose

type composeWithMysqlOptsT = {
    graphqlTypeName: string,
    mysqlClient: Object,
    mysqlTable: string,
    prefix?: ?string,
    postfix?: ?string,
}

export function composeWithMysql(opts: composeWithMysqlOptsT): TypeComposer {
    if (!opts) {
        throw new Error("Opts is required argument for composeWithElastic()")
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

    // const fieldMap = inputPropertiesToGraphQLTypes(opts.elasticMapping);
    const sourceTC = convertToSourceTC(opts)

    // const searchR = createSearchResolver(fieldMap, sourceTC, opts);
    // const searchConnectionR = createSearchConnectionResolver(searchR, opts);
    // const searchPaginationR = createSearchPaginationResolver(searchR, opts);
    // const findByIdR = createFindByIdResolver(fieldMap, sourceTC, opts);
    // const updateByIdR = createUpdateByIdResolver(fieldMap, sourceTC, opts);

    // sourceTC.addResolver(searchR);
    // sourceTC.addResolver(searchConnectionR);
    // sourceTC.addResolver(searchPaginationR);
    // sourceTC.addResolver(findByIdR);
    // sourceTC.addResolver(updateByIdR);

    return TypeComposer.create({
        name: "Author",
        fields: {
            id: "Int!",
            firstName: "String",
            lastName: "String",
        },
    })
}
