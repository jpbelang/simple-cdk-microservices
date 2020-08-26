import {Queue} from "@aws-cdk/aws-sqs";
import {Topic} from "@aws-cdk/aws-sns";
import '@aws-cdk/assert/jest';
import {Stack} from "@aws-cdk/core";
import {Table} from "@aws-cdk/aws-dynamodb";
import {DynamoConfigurator, DynamoDBHandler} from "../../main/js/dynamo_db";

const {Runtime, AssetCode} = jest.requireActual("@aws-cdk/aws-lambda");
const {AttributeType} = jest.requireActual("@aws-cdk/aws-dynamodb");


const grantReadWriteDataMock = jest.fn().mockImplementation()
jest.mock('@aws-cdk/aws-dynamodb', () => {
    const tableMock = jest.fn().mockImplementation(() => {
        return {
            grantReadWriteData: grantReadWriteDataMock
        };
    });
    return {
        Table: tableMock,
        BillingMode: {
            PAY_PER_REQUEST: "PAY_PER_REQUEST"
        }
    };
});

describe("mock dynamo db testing", () => {

        beforeEach(() => {

        })
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("configuration of handler", () => {

            const lh = DynamoDBHandler.create({
                partitionKey: { name: "pk", type: AttributeType.STRING},
                sortKey: { name: "sk", type: AttributeType.STRING},
                tableName: "myTable",
            })

            let theStack = new Stack();
            const configurator = lh.handle({
                deadLetterQueue: new Queue(theStack, "dead"),
                parentConstruct: theStack,
                parentName: "hola",
                topic: new Topic(theStack, "topic", {
                    topicName: "topicName"
                })
            })

            expect(configurator.id).toEqual("hola-myTable-Table")
        })

        it("post configuration", () => {

            const actualTable = Table.prototype.constructor() as Table

            const configurator = new DynamoConfigurator("foo", "goo", actualTable)
            const grantable = jest.fn().mockImplementation() as any
            configurator.grantSecurityTo(grantable)
            expect(grantReadWriteDataMock.mock.calls[0][0]).toEqual(grantable)
        })

    }
);