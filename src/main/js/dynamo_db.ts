/*
class DynamoTableHandler(RequestHandler):

    def __init__(self, name: str, partition_key: dynamo.Attribute, sort_key: dynamo.Attribute,
                 stream: Optional[dynamo.StreamViewType], connection_callback: Callable[[sns.Topic], None],
                 construct_callback: Callable[[dynamo.Table], None]) -> None:
        super().__init__(connection_callback=connection_callback)

        self._partition_key = partition_key
        self._sort_key = sort_key
        self._name = name
        self._stream = stream
        self._construct_callback = construct_callback

    @classmethod
    def create_handler(cls, name: str,
                       partition_key: dynamo.Attribute,
                       sort_key: Optional[dynamo.Attribute] = None,
                       stream: Optional[dynamo.StreamViewType] = None,
                       connection_callback: Optional[Callable[[sns.Topic], None]] = lambda target: None,
                       construct_callback: Optional[Callable[[dynamo.Table], None]] = lambda target: None):

        return DynamoTableHandler(name=name,
                                  partition_key=partition_key,
                                  sort_key=sort_key,
                                  stream=stream,
                                  connection_callback=connection_callback,
                                  construct_callback=construct_callback)

    def handler(self, scope: core.Construct, name: str, asset: lambdas.AssetCode, runtime: EnvironmentConfiguration,
                environment_configuration: lambdas.Runtime, service_topic: sns.Topic, dead_letter_queue: sqs.Queue) -> Tuple[core.Construct, Callable[[core.Construct], None]]:

        removal_policy = RemovalPolicy.RETAIN
        billing_mode = BillingMode.PROVISIONED
        if environment_configuration < EnvironmentConfiguration.DEV:
            removal_policy = RemovalPolicy.DESTROY
            billing_mode = BillingMode.PAY_PER_REQUEST

        table = dynamo.Table(scope=scope, id="{0}-{1}-table".format(name, self._name),
                             table_name="{0}-{1}-table".format(
                                 name, self._name),
                             partition_key=self._partition_key, sort_key=self._sort_key, stream=self._stream,
                             removal_policy=removal_policy, billing_mode=billing_mode)
        self._construct_callback(table)

        def _post_construction(function: core.Construct):
            if isinstance(function, lambdas.Function):
                f: lambdas.Function = function
                f.add_environment("dynamo_" + self._name.lower(), table.table_name)
                table.grant_read_write_data(grantee=f)

        return table, _post_construction

 */

import {Configurator, Handler, HandlerOptions} from "./microservice";
import {Attribute, BillingMode, Table} from "@aws-cdk/aws-dynamodb";
import {RemovalPolicy} from "@aws-cdk/core";
import {IGrantable} from "@aws-cdk/aws-iam"
import {Function} from "@aws-cdk/aws-lambda";

type DynamoDBHandlerData = {
    name: string,
    partitionKey: Attribute
    sortKey: Attribute
}

class DynamoDBHandler implements Handler {
    private data: DynamoDBHandlerData;

    constructor(data: DynamoDBHandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let tableName = `${config.parentName}-${this.data.name}-Table`;
        const table = new Table(config.parentConstruct, tableName, {
            tableName: tableName,
            partitionKey: this.data.partitionKey,
            sortKey: this.data.sortKey,
            removalPolicy: RemovalPolicy.DESTROY,
            billingMode: BillingMode.PAY_PER_REQUEST
        })

        return  {
            id: tableName,

            wantEnvironment(z: Configurator) {
            },

            wantSecurity(z: Configurator) {
            },

            giveEnvironment(setter: (key: string, value: string) => void) {

                setter(`dynamo_${tableName}`, `${config.parentName}-${tableName}-Table`)
            },

            giveSecurity(grantable: IGrantable) {
                table.grantReadWriteData(grantable)
            }
        }
    }

    static create(data: DynamoDBHandlerData) {

        return new DynamoDBHandler(data)
    }
}