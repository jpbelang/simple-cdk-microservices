import {Construct} from "constructs";
import {HandlerOptions} from "./microservice";
import {Optional} from "typescript-optional";
import {DynamoDBHandlerData} from "./dynamo_db";
import {LambdaSubscribedHandlerData} from "./subscribed_lambda";


export type Compatibility<T> = {
    compatibility?: CompatibilityChange<T>
}

export function calculateParentage<T extends Compatibility<T>>(compatibility: T, config: HandlerOptions) {
    return Optional.ofNullable(compatibility.compatibility)
        .map(compat => executeCompatibilityChange(config.parentConstruct, config.handlerName, compatibility, compat))
        .orElse({id: config.handlerName, parent: config.parentConstruct});
}

function executeCompatibilityChange<T>(parentConstruct: Construct, localName: string, data: T, change: CompatibilityChange<T>) {
    const parentList = buildParentList(parentConstruct)
    return change({constructs: parentList, localName, data})
}

function buildParentList(c: Construct): Construct[] {
    const parentList: Construct[] = []
    let parent = c;
    while (parent) {
        parentList.push(parent)
        parent = parent.node.scope as Construct;
    }
    return parentList
}

export type CompatibilityChange<T> = (s: {
    constructs: Construct[]
    localName: string
    data: T
}) => { parent: Construct, id: string }

export const V1ToV2Table: CompatibilityChange<DynamoDBHandlerData> = ({constructs, localName, data}) => {

    return {
        parent: constructs[1],
        id: constructs[0].node.id + "-" + localName
    }
}

export const V1ToV2Handler: CompatibilityChange<LambdaSubscribedHandlerData> = ({constructs, localName, data}) => {

    return {
        parent: constructs[1],
        id: data.handler // wrong.  need to get the name of the lambda
    }
}

//first-example-myTable, ExampleStack/first-example/myTable/Resource