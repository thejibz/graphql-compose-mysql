const GraphQL = require("graphql")
const { composeWithMysql } = require("../src/main")

describe("Limit test", () => {
    jest.setTimeout(30000)

    test("get only the first 2 employees with only _limit parameter", () => {
        return composeWithMysql({
            mysqlConfig: {
                //debug: ['ComQueryPacket'],
                //connectionLimit: 100,
                prefix: "emp_",
                host: "localhost",
                port: 3306,
                user: "root",
                password: "secret",
                database: "employees",
            },
        }).then(employeesSchema => {
            const gqlQuery = `
            {
                employees (_limit: 2) {
                  emp_no
                  first_name
                  last_name
                  gender
                  birth_date
                  hire_date
                }
            }`

            return GraphQL.graphql({
                schema: employeesSchema,
                source: gqlQuery,
                variableValues: {},
                contextValue: {}
            }).then(gqlResponse => {
                expect(gqlResponse).toMatchObject({
                    "data": {
                        "employees": [{
                            "birth_date": "1953-09-01T23:00:00.000Z",
                            "emp_no": 10001,
                            "first_name": "Georgi",
                            "gender": "M",
                            "hire_date": "1986-06-25T22:00:00.000Z",
                            "last_name": "Facello"
                        },
                        {
                            "birth_date": "1964-06-01T23:00:00.000Z",
                            "emp_no": 10002,
                            "first_name": "Bezalel",
                            "gender": "F",
                            "hire_date": "1985-11-20T23:00:00.000Z",
                            "last_name": "Simmel"
                        }]
                    }
                }
                )
            })
        })
    })

    test("get only the first 2 employees with _limit and another parameter", () => {
        return composeWithMysql({
            mysqlConfig: {
                //debug: ['ComQueryPacket'],
                //connectionLimit: 100,
                prefix: "emp_",
                host: "localhost",
                port: 3306,
                user: "root",
                password: "secret",
                database: "employees",
            },
        }).then(employeesSchema => {
            const gqlQuery = `
            {
                employees (_limit: 2, gender: "F") {
                  emp_no
                  first_name
                  last_name
                  gender
                  birth_date
                  hire_date
                }
            }`

            return GraphQL.graphql({
                schema: employeesSchema,
                source: gqlQuery,
                variableValues: {},
                contextValue: {}
            }).then(gqlResponse => {
                expect(gqlResponse).toMatchObject({
                    "data": {
                        "employees": [{
                            "birth_date": "1964-06-01T23:00:00.000Z",
                            "emp_no": 10002,
                            "first_name": "Bezalel",
                            "gender": "F",
                            "hire_date": "1985-11-20T23:00:00.000Z",
                            "last_name": "Simmel"
                        },
                        {
                            "birth_date": "1953-04-19T23:00:00.000Z",
                            "emp_no": 10006,
                            "first_name": "Anneke",
                            "gender": "F",
                            "hire_date": "1989-06-01T22:00:00.000Z",
                            "last_name": "Preusig"
                        }]
                    }
                })
            })
        })
    })
})