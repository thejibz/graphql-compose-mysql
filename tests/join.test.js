const debug = require("debug")("graphql-compose-mysql")
const GraphQL = require("graphql")
const { composeWithMysql } = require("../src/index")

describe("Test the worldql", () => {
    jest.setTimeout(30000)

    let context = {}

    afterEach(() => {
        debug(context)
        context.gqlComposeMysql3b9e9f14bc93d8a1383d1a3c599c2849.mysqlPool.end() // :/ Only way ?
    })

    test("get dept_manager with join on employees and departments", () => {
        return composeWithMysql({
            mysqlConfig: {
                connectionLimit: 100,
                host: "localhost",
                port: 3306,
                user: "root",
                password: "secret",
                database: "employees",
            },
        }).then(employeesSchema => {
            const gqlQuery = `
            {
                dept_manager(dept_no: "d003") {
                    from_date
                    emp_no
                    employees {
                      emp_no
                      last_name
                    }
                    departments {
                      dept_name
                    }
                  }
            }`

            return GraphQL.graphql({
                schema: employeesSchema,
                source: gqlQuery,
                variableValues: {},
                contextValue: context
            }).then(gqlResponse => {
                expect(gqlResponse).toMatchObject(
                    {
                        "data": {
                            "dept_manager": [
                                {
                                    "from_date": "1984-12-31T23:00:00.000Z",
                                    "emp_no": 110183,
                                    "employees": [
                                        {
                                            "emp_no": 110183,
                                            "last_name": "Ossenbruggen"
                                        }
                                    ],
                                    "departments": [
                                        {
                                            "dept_name": "Human Resources"
                                        }
                                    ]
                                },
                                {
                                    "from_date": "1992-03-20T23:00:00.000Z",
                                    "emp_no": 110228,
                                    "employees": [
                                        {
                                            "emp_no": 110228,
                                            "last_name": "Sigstam"
                                        }
                                    ],
                                    "departments": [
                                        {
                                            "dept_name": "Human Resources"
                                        }
                                    ]
                                }
                            ]
                        }
                    })
            })
        })
    })
})