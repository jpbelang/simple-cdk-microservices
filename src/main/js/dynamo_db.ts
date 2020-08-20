import {Configurator, DefaultConfigurator, Handler, HandlerOptions} from "./microservice"
import {Attribute, BillingMode, Table} from "@aws-cdk/aws-dynamodb"
import {RemovalPolicy} from "@aws-cdk/core";
import {IGrantable} from "@aws-cdk/aws-iam"

type DynamoDBHandlerData = {
    name: string,
    partitionKey: Attribute
    sortKey: Attribute
}

export class DynamoDBHandler implements Handler {
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

        return new DynamoConfigurator(tableName, this.data.name, table)
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

    giveEnvironment(setter: (key: string, value: string) => void) {

        setter(`dynamo_${this.tablename}`, `${this.id}-Table`)
    }

    giveSecurity(grantable: IGrantable) {
        this.table.grantReadWriteData(grantable)
    }
}