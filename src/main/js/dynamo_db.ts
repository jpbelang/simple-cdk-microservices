import {Configurator, DefaultConfigurator, Handler, HandlerOptions, NonMandatoryTaggingType} from "./microservice"
import {
    BillingMode,
    GlobalSecondaryIndexProps,
    Table,
    TableProps
} from "aws-cdk-lib/aws-dynamodb"
import {RemovalPolicy, Tags} from "aws-cdk-lib";
import {IGrantable} from "aws-cdk-lib/aws-iam"
import {Optional} from "typescript-optional";
import {IEventSource, StartingPosition} from "aws-cdk-lib/aws-lambda";
import {DynamoEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {Construct} from "constructs";
import {buildParentList, CompatibilityChange} from "./compatibility";

export type DynamoDBHandlerData = {
    compatibility?: CompatibilityChange
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

        const adjustedProps = Object.assign( {}, this.data, {
            removalPolicy: Optional.ofNullable(this.data.removalPolicy).orElse(RemovalPolicy.DESTROY),
            billingMode: Optional.ofNullable(this.data.billingMode).orElse(BillingMode.PAY_PER_REQUEST)
        });

        const parentage = Optional.ofNullable(this.data.compatibility)
            .map(compat => compat({constructs: buildParentList(config.parentConstruct), localName:  config.handlerName}))
            .orElse({id:config.handlerName, parent: config.parentConstruct})
        const table = new Table(parentage.parent, parentage.id, adjustedProps)

        Optional.ofNullable(this.data.globalIndices).orElse([] as any).forEach(gsi => {
            table.addGlobalSecondaryIndex(gsi)
        })
        Optional.ofNullable(this.data.tableConfigurator).ifPresent(f => f(table, this.data, config))

        Object.entries(Optional.ofNullable(this.data.tags).orElse({})).forEach( ([k,v]) => Tags.of(table).add(k,v, {
            priority: 101
        }))
        return new DynamoConfigurator(config.handlerName, config.handlerName, table)
    }

    static create(data: DynamoDBHandlerData) {

        return new DynamoDBHandler(data)
    }
}

export class DynamoConfigurator extends DefaultConfigurator {


    constructor(id: string, private readonly logicalTableName: string, private readonly  table: Table) {
        super(id);
    }

    setEnvironment(setter: (key: string, value: string) => void) {

        setter(`dynamo_${this.logicalTableName}`, `${this.table.tableName}`)
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