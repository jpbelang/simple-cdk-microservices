import {Configurator, DefaultConfigurator, Handler, HandlerOptions, NonMandatoryTaggingType} from "./microservice"
import {
    BillingMode,
    GlobalSecondaryIndexProps,
    Table,
    TableProps
} from "@aws-cdk/aws-dynamodb"
import {RemovalPolicy, Tags} from "@aws-cdk/core";
import {IGrantable} from "@aws-cdk/aws-iam"
import {Optional} from "typescript-optional";
import {IEventSource, StartingPosition} from "@aws-cdk/aws-lambda";
import {DynamoEventSource} from "@aws-cdk/aws-lambda-event-sources";
import * as lambda from "@aws-cdk/aws-lambda";

export type DynamoDBHandlerData = {
    tableName: string
    globalIndices?: [GlobalSecondaryIndexProps]
    tableConfigurator?: (table: Table, data: DynamoDBHandlerData, config: HandlerOptions) => void
    tags?: NonMandatoryTaggingType
} & TableProps

export class DynamoDBHandler implements Handler {
    private data: DynamoDBHandlerData;

    constructor(data: DynamoDBHandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let tableName = `${config.parentName}-${this.data.tableName}`;
        const adjustedProps = Object.assign( {}, this.data, {
            tableName: tableName,
            removalPolicy: Optional.ofNullable(this.data.removalPolicy).orElse(RemovalPolicy.DESTROY),
            billingMode: Optional.ofNullable(this.data.billingMode).orElse(BillingMode.PAY_PER_REQUEST)
        });
        const table = new Table(config.parentConstruct, tableName, adjustedProps)

        Optional.ofNullable(this.data.globalIndices).orElse([] as any).forEach(gsi => {
            table.addGlobalSecondaryIndex(gsi)
        })
        Optional.ofNullable(this.data.tableConfigurator).ifPresent(f => f(table, this.data, config))

        Object.entries(Optional.ofNullable(this.data.tags).orElse({})).forEach( ([k,v]) => Tags.of(table).add(k,v, {
            priority: 101
        }))
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

        setter(`dynamo_${this.tablename}`, `${this.id}`)
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