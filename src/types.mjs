/* @flow */

export type composeWithMysqlOptsT = {
    graphqlTypeName: string,
    mysqlClient: Object,
    mysqlTable: string,
    prefix?: ?string,
    postfix?: ?string,
}

export type mysqlFieldT = {
    Field: string,
    Type: string,
    Collation: string,
    Null: string,
    Key: string,
    Default: any,
    Extra: string,
    Privileges: string,
    Comment: string,
}

export type mysqlTableT = {
    [fieldName: string]: mysqlFieldT,
}
