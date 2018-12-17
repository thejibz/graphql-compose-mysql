const GraphQL = require("graphql")
const { composeWithMysql } = require("../src/index")

describe("Test the worldql", () => {
    jest.setTimeout(30000)

    test("get all fields for employee n°10001", () => {
        return composeWithMysql({
            graphqlTypeName: "employeeT",
            mysqlConfig: {
                connectionLimit: 100,
                host: "localhost",
                port: 3306,
                user: "root",
                password: "secret",
                database: "employees",
            },
            mysqlTableName: "employees",
        }).then(employeesSchema => {
            const gqlQuery = `
            {
                employees(emp_no: 10001) {
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
                variableValues: {}
            }).then(gqlResponse => {
                expect(gqlResponse).toMatchObject({
                    data: {
                        employees: [{
                            emp_no: 10001,
                            first_name: "Georgi",
                            last_name: "Facello",
                            gender: "M",
                            birth_date: "1953-09-01T23:00:00.000Z",
                            hire_date: "1986-06-25T22:00:00.000Z"
                        }]
                    }
                })
            })
        })
    })

    test("get some fields for employee n°10001, 10002, 10003, 10004, 10005, 10006", () => {
        return composeWithMysql({
            graphqlTypeName: "employeeT",
            mysqlConfig: {
                host: "localhost",
                port: 3306,
                user: "root",
                password: "secret",
                database: "employees",
            },
            mysqlTableName: "employees",
        }).then(employeesSchema => {

            const gqlQuery = `
            {
                emp_10001: employees(emp_no: 10001) {
                    last_name
                    gender
                    birth_date
                    hire_date
                }
                emp_10001bis: employees(emp_no: 10001) {
                  last_name
                  gender
                  birth_date
                  hire_date
                }
                emp_10001ter: employees(emp_no: 10001) {
                    last_name
                    gender
                    birth_date
                    hire_date
                  }
                  emp_10001a: employees(emp_no: 10001) {
                    last_name
                    gender
                    birth_date
                    hire_date
                  }
                  emp_10001b: employees(emp_no: 10001) {
                    last_name
                    gender
                    birth_date
                    hire_date
                  }
                  emp_10001c: employees(emp_no: 10001) {
                    last_name
                    gender
                    birth_date
                    hire_date
                  }
                  emp_10001d: employees(emp_no: 10001) {
                    last_name
                    gender
                    birth_date
                    hire_date
                  }
              }`

            return GraphQL.graphql({
                schema: employeesSchema,
                source: gqlQuery,
                variableValues: {}
            }).then(gqlResponse => {
                expect(gqlResponse).toMatchObject({
                    data: {
                        emp_10001: [
                            {
                                last_name: "Facello",
                                gender: "M",
                                birth_date: "1953-09-01T23:00:00.000Z",
                                hire_date: "1986-06-25T22:00:00.000Z"
                            }
                        ],
                        emp_10001bis: [
                            {
                                last_name: "Facello",
                                gender: "M",
                                birth_date: "1953-09-01T23:00:00.000Z",
                                hire_date: "1986-06-25T22:00:00.000Z"
                            }
                        ],
                        emp_10001ter: [
                            {
                                last_name: "Facello",
                                gender: "M",
                                birth_date: "1953-09-01T23:00:00.000Z",
                                hire_date: "1986-06-25T22:00:00.000Z"
                            }
                        ],
                        emp_10001a: [
                            {
                                last_name: "Facello",
                                gender: "M",
                                birth_date: "1953-09-01T23:00:00.000Z",
                                hire_date: "1986-06-25T22:00:00.000Z"
                            }
                        ],
                        emp_10001b: [
                            {
                                last_name: "Facello",
                                gender: "M",
                                birth_date: "1953-09-01T23:00:00.000Z",
                                hire_date: "1986-06-25T22:00:00.000Z"
                            }
                        ],
                        emp_10001c: [
                            {
                                last_name: "Facello",
                                gender: "M",
                                birth_date: "1953-09-01T23:00:00.000Z",
                                hire_date: "1986-06-25T22:00:00.000Z"
                            }
                        ],
                        emp_10001d: [
                            {
                                last_name: "Facello",
                                gender: "M",
                                birth_date: "1953-09-01T23:00:00.000Z",
                                hire_date: "1986-06-25T22:00:00.000Z"
                            }
                        ]
                    }
                })
            })
        })
    })
})