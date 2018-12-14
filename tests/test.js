const GraphQL = require("graphql")
const { composeWithMysql } = require("../src/index")

describe("Test the worldql", () => {
    jest.setTimeout(30000)

    test("get all fields for employee n°10001", () => {
        return composeWithMysql({
            graphqlTypeName: "employeeT",
            mysqlConfig: {
                connectionLimit : 100,
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
                employees(emp_no: 10001, first_name: "Georgi", gender: "M") {
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

    test("get all fields for employee n°10005", () => {
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
                employees(emp_no: 10005) {
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
                            emp_no: 10005,
                            first_name: "Kyoichi",
                            last_name: "Maliniak",
                            gender: "M",
                            birth_date: "1955-01-20T23:00:00.000Z",
                            hire_date: "1989-09-11T22:00:00.000Z"
                        }]
                    }
                })
            })
        })
    })
})