import {Configurator, DefaultConfigurator, Handler, HandlerOptions} from "./microservice"
import {BillingMode, Table, TableProps} from "@aws-cdk/aws-dynamodb"
import {RemovalPolicy} from "@aws-cdk/core";
import {IGrantable} from "@aws-cdk/aws-iam"
import {Optional} from "typescript-optional";
import {IEventSource, StartingPosition} from "@aws-cdk/aws-lambda";
import {DynamoEventSource} from "@aws-cdk/aws-lambda-event-sources";

type DynamoDBHandlerData = {
    tableName: string
} & TableProps

export class DynamoDBHandler implements Handler {
    private data: DynamoDBHandlerData;

    constructor(data: DynamoDBHandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let tableName = `${config.parentName}-${this.data.tableName}-Table`;
        const adjustedProps = Object.assign(this.data, {
            tableName: tableName,
            removalPolicy: Optional.ofNullable(this.data.removalPolicy).orElse(RemovalPolicy.DESTROY),
            billingMode: Optional.ofNullable(this.data.billingMode).orElse(BillingMode.PAY_PER_REQUEST)
        });
        const table = new Table(config.parentConstruct, tableName, adjustedProps)

            return new DynamoConfigurator(tableName, this.data.tableName, table)
    }

    static create(data: DynamoDBHandlerData) {

        return new DynamoDBHandler(data)
    }
}

export class DynamoConfigurator extends DefaultConfigurator {

    private readonly tablename: string;
    private readonly table: Table;

    constructor(id: string, tablename: string, table: Table) {
        super(id);
        this.tablename = tablename;
        this.table = table
    }

    setEnvironment(setter: (key: string, value: string) => void) {

        setter(`dynamo_${this.tablename}`, `${this.id}-Table`)
    }

    grantSecurityTo(grantable: IGrantable) {
        this.table.grantReadWriteData(grantable)
    }

    receiveInternalEvents(setter: (source: IEventSource) => void) {
        if ( this.table.tableStreamArn != null ) {

            setter(new DynamoEventSource(this.table, {
                startingPosition: StartingPosition.LATEST,
                batchSize: 5,
                retryAttempts: 10
            }))
        }
    }
}