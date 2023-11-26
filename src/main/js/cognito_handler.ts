import {
    UserPool,
    UserPoolClient,
    UserPoolClientIdentityProvider,
    UserPoolClientOptions,
    UserPoolOperation,
    UserPoolProps,
    UserPoolTriggers
} from "aws-cdk-lib/aws-cognito";
import {Optional} from "typescript-optional";
import {Function} from "aws-cdk-lib/aws-lambda";
import {Construct} from "constructs";
import {RemovalPolicy} from "aws-cdk-lib";
import {Configurator, DefaultConfigurator, Handler, HandlerOptions, NonMandatoryTaggingType} from "./microservice";
import {calculateParentage, Compatibility} from "./compatibility";

type Builder<T> = (c: Construct) => T

// trying this.
type LambdaTriggerFactoriesType = {
    [K in keyof UserPoolTriggers]: Builder<Function>
}
export interface UserPoolHandlerData extends Omit<UserPoolProps, "lambdaTriggers">, Compatibility<UserPoolHandlerData>{
    tags?: NonMandatoryTaggingType,
    lambdaTriggerFactories?: LambdaTriggerFactoriesType,
}

export class CognitoHandler implements Handler {

    constructor(private data: UserPoolHandlerData) {
    }

    handle(config: HandlerOptions): Configurator {

        const parentage = calculateParentage(this.data, config)

        const userPool = new UserPool(parentage.parent, parentage.id, {
            ...this.data,
            removalPolicy: Optional.ofNullable(this.data.removalPolicy).orElse(RemovalPolicy.DESTROY),
        })

        const client = userPool.addClient("web", {
            authFlows: {
                adminUserPassword: true,
                custom: true,
                userPassword: true,
                userSrp: true
            },
            supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO]
        } as UserPoolClientOptions)

        const functions = Object.entries(Optional.ofNullable(this.data.lambdaTriggerFactories).orElse({})).map(([name, funk]) => {

            const trigger = funk(config.parentConstruct)
//                .addEnvironment("cognitoUserPool", userPool.userPoolArn)
//                .addEnvironment("cognitoClient", client.userPoolClientId)

            userPool.addTrigger(UserPoolOperation.of(name), trigger)
            return trigger;
        })

        return new CognitoConfigurator(userPool.userPoolId, config.handlerName, userPool, client, functions);
    }

    static create(props: UserPoolHandlerData) {
        return new CognitoHandler(props)
    }
}


export class CognitoConfigurator extends DefaultConfigurator {

    constructor(id: string, private logicalTableName: string, private pool: UserPool, private client: UserPoolClient, private functions: Function[]) {
        super(id)
    }

    wantEnvironment(z: Configurator) {
        z.setEnvironment((k, v) => this.functions.forEach(funk => funk.addEnvironment(k, v)));
    }

    setEnvironment(setter: (key: string, value: string) => void) {

        setter(`cognitoUserPool_${this.logicalTableName}`, `${this.pool.userPoolArn}`)
        setter(`cognitoUserPoolId_${this.logicalTableName}`, `${this.pool.userPoolId}`)
        setter(`cognitoUserPoolClientId_${this.logicalTableName}`, `${this.client.userPoolClientId}`)
    }
}