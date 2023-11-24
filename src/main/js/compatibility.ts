import {Construct} from "constructs";
import {HandlerOptions} from "./microservice";
import {Optional} from "typescript-optional";


export function  calculateParentage(compatibility: CompatibilityChange|undefined, config: HandlerOptions) {
    return Optional.ofNullable(compatibility)
        .map(compat => executeCompatibilityChange(config.parentConstruct, config.handlerName, compat))
        .orElse({id: config.handlerName, parent: config.parentConstruct});
}

function executeCompatibilityChange(parentConstruct: Construct, localName: string, change: CompatibilityChange) {
    const parentList = buildParentList(parentConstruct)
    return change({constructs: parentList, localName})
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

export type CompatibilityChange = (s: {
    constructs: Construct[]
    localName: string
}) => { parent: Construct, id: string }

export const V1ToV2Table: CompatibilityChange = ({constructs, localName}) => {

    return {
        parent: constructs[1],
        id: constructs[0].node.id + "-" + localName
    }
}
//first-example-myTable, ExampleStack/first-example/myTable/Resource