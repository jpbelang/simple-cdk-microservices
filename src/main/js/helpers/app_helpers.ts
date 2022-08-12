import * as Process from "process";


export function dynamoTableEnvName(name: string): string|undefined {

    return Process.env[`dynamo_${name}`]
}

export function localQueueEnvName(handler: string): string|undefined {

    return Process.env[ `async_${handler.replace(/\./, "_")}_Queue`]
}

export function userPoolCLientId(handler: string): string|undefined {

    return Process.env[ `cognitoUserPoolClientId_${handler.replace(/\./, "_")}`]
}