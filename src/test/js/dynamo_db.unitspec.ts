import {Queue} from "aws-cdk-lib/aws-sqs";
import {Topic} from "aws-cdk-lib/aws-sns";

import {Stack} from "aws-cdk-lib";
import {DynamoDBHandler} from "../../main/js";
import {AttributeType} from "aws-cdk-lib/aws-dynamodb";
import {Match, Template} from "aws-cdk-lib/assertions";
import {snsReceiver} from "../../main/js/microservice";


describe("dynamo db testing", () => {

        it("create dynamodb", () => {

            const lh = DynamoDBHandler.create({
                partitionKey: {name: "pk", type: AttributeType.STRING},
                sortKey: {name: "sk", type: AttributeType.STRING},
                tableName: "myTable",
            })

            let theStack = new Stack();
            const f = snsReceiver()({
                name: "boo"
            } as any, theStack)

            lh.handle({
                env: "Dev",
                deadLetterQueue: () => new Queue(theStack, "dead"),
                deadLetterFifoQueue: () => new Queue(theStack, "deadFifo"),
                parentConstruct: theStack,
                handlerName: "hola",
                publisher: f
            })

            const template = Template.fromStack(theStack);

            template.hasResource("AWS::DynamoDB::Table", Match.objectLike(  {
                    "Type": "AWS::DynamoDB::Table",
                    "Properties": {
                        "KeySchema": [
                            {
                                "AttributeName": "pk",
                                "KeyType": "HASH"
                            },
                            {
                                "AttributeName": "sk",
                                "KeyType": "RANGE"
                            }
                        ],
                        "AttributeDefinitions": [
                            {
                                "AttributeName": "pk",
                                "AttributeType": "S"
                            },
                            {
                                "AttributeName": "sk",
                                "AttributeType": "S"
                            }
                        ],
                        "BillingMode": "PAY_PER_REQUEST",
                        "TableName": "myTable"
                    },
                    "UpdateReplacePolicy": "Delete",
                    "DeletionPolicy": "Delete"
                })
            )

        })
    }
)
