const GraphQL = require("graphql")
const { composeWithMysql } = require("../src/main")

describe("Test the worldql", () => {
    jest.setTimeout(30000)

     test("get all fields for employee n°10001", () => {
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
                variableValues: {},
                contextValue: {}
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

    test("get some fields from some employees multiples times (dataloader test)", () => {
        return composeWithMysql({
            mysqlConfig: {
                host: "localhost",
                port: 3306,
                user: "root",
                password: "secret",
                database: "employees",
            },
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
                emp_10001ter: employees(emp_no: 10001, gender:"M") {
                    last_name
                    gender
                    birth_date
                    hire_date
                  }
                  emp_10002: employees(emp_no: 10002, gender:"F") {
                    last_name
                    gender
                    birth_date
                    hire_date
                  }
                  emp_10003: employees(emp_no: 10003) {
                    emp_no
                    first_name
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
                variableValues: {},
                contextValue: {}
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
                        emp_10002: [
                            {
                                "last_name": "Simmel",
                                "gender": "F",
                                "birth_date": "1964-06-01T23:00:00.000Z",
                                "hire_date": "1985-11-20T23:00:00.000Z"
                            }
                        ],
                        emp_10003: [
                            {
                                "emp_no": 10003,
                                "first_name": "Parto",
                                "last_name": "Bamford",
                                "gender": "M",
                                "birth_date": "1959-12-02T23:00:00.000Z",
                                "hire_date": "1986-08-27T22:00:00.000Z"
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