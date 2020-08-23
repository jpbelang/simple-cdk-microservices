import {LambdaConfigurator} from "../../main/js/subscribed_lambda";
import {Function} from "@aws-cdk/aws-lambda";
import '@aws-cdk/assert/jest';
import {IGrantable} from "@aws-cdk/aws-iam"
import {Configurator} from "../../main/js/microservice";
import {configureTree, simpleMethod, simpleResource} from "../../main/js/web_lambda";
import {Resource} from "@aws-cdk/aws-apigateway";

const {Runtime, AssetCode} = jest.requireActual("@aws-cdk/aws-lambda");


const addEnvironmentMock = jest.fn().mockImplementation()
jest.mock('@aws-cdk/aws-lambda', () => {
    const functionMock = jest.fn().mockImplementation(() => {
        return {
            addEnvironment: addEnvironmentMock
        };
    });
    return {
        Function: functionMock,
    };
});

const addResource = jest.fn().mockImplementation()
const addMethod = jest.fn().mockImplementation()
jest.mock("@aws-cdk/aws-apigateway", () => {
    const functionMock = jest.fn().mockImplementation(() => {
        return {
            addResource: addResource.mockReturnThis(),
            addMethod: addMethod
        };
    });
    return {
        Resource: functionMock,
    };
});


describe("mock web lambda testing", () => {

        beforeEach(() => {

        })

        afterEach(() => {
            jest.clearAllMocks();
        });

        it("test recursive resource builder", () => {

            const actualFunction = Function.prototype.constructor()
            const resource = Resource.prototype.constructor();

            configureTree(actualFunction, resource,  {
                "fun": {
                    POST: simpleMethod(),
                    PUT: simpleMethod(),
                    "more": simpleResource({
                        GET: simpleMethod()
                    })
                }
            })

            expect(addResource).toHaveBeenCalledWith("fun")
            expect(addMethod).toBeCalledWith("POST")
            expect(addResource).toHaveBeenCalledWith("more")
            expect(addMethod).toBeCalledWith("GET")
        })


        it("post configuration", () => {

            const actualFunction = Function.prototype.constructor() as Function

            const configurator = new LambdaConfigurator("foo", actualFunction)
            configurator.wantEnvironment({
                id: "",
                giveEnvironment(setter: (key: string, value: string) => void): void {
                    setter("hello", "goodbye")
                },
                giveSecurity(grantable: IGrantable): void {
                },
                wantEnvironment(z: Configurator): void {
                },
                wantSecurity(z: Configurator): void {
                }

            });

            expect(addEnvironmentMock.mock.calls[0]).toEqual(["hello", "goodbye"])
        })

    }
);