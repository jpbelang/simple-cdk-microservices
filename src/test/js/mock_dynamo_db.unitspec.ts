import {Queue} from "aws-cdk-lib/aws-sqs";
import {Topic} from "aws-cdk-lib/aws-sns";
import {Stack} from "aws-cdk-lib";
import {Table} from "aws-cdk-lib/aws-dynamodb";
import {DynamoConfigurator, DynamoDBHandler} from "../../main/js/dynamo_db";

const {Runtime, AssetCode} = jest.requireActual("aws-cdk-lib/aws-lambda");
const {AttributeType} = jest.requireActual("aws-cdk-lib/aws-dynamodb");


const grantReadWriteDataMock = jest.fn().mockImplementation()
jest.mock('aws-cdk-lib/aws-dynamodb', () => {
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
            const configurator: DynamoConfigurator= lh.handle({
                env: "Dev",
                deadLetterQueue: () => new Queue(theStack, "dead"),
                deadLetterFifoQueue: () => new Queue(theStack, "deadFifo"),
                parentConstruct: theStack,
                handlerName: "hola",
                topic: new Topic(theStack, "topic", {
                    topicName: "topicName"
                })
            }) as any

            expect(configurator.id).toEqual("hola")

            let key;
            let value;
            expect(configurator.setEnvironment((k,v) => {
                key = k
                value = v
            }))
            expect(key).toBe("dynamo_hola")
            expect(value).toBe("undefined"); // not brilliant, but it's what the mocks do.
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