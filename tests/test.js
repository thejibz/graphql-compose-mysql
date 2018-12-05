const mysql = require("mysql")
const GraphQL = require("graphql")
const { composeWithMysql } = require("../src/index")

describe("Test the worldql", () => {
    jest.setTimeout(30000)

    let mysqlClient = {}

    beforeAll(() => {
        mysqlClient = mysql.createConnection({
            host: "localhost",
            port: 3306,
            user: "root",
            password: "secret",
            database: "employees",
        })

        // open connection
        mysqlClient.connect()
    })

    afterAll(() => {
        // Release connection
        mysqlClient.end()
    })

    test("get all fields for employee n°10001", () => {
        return composeWithMysql({
            graphqlTypeName: "employeeT",
            mysqlClient: mysqlClient,
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
})