import {Construct} from "constructs";

export function buildParentList(c: Construct): Construct[] {
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
}) => {parent: Construct, id: string}

export const V1ToV2Table: CompatibilityChange = ({constructs, localName}) => {

    return {
        parent: constructs[1],
        id: constructs[0].node.id + "-" + localName
    }
}
//first-example-myTable, ExampleStack/first-example/myTable/Resource