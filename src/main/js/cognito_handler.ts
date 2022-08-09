import {
    UserPool,
    UserPoolClientIdentityProvider,
    UserPoolClientOptions, UserPoolOperation,
    UserPoolProps,
    UserPoolTriggers
} from "aws-cdk-lib/aws-cognito";
import {Optional} from "typescript-optional";
import {IFunction, Function} from "aws-cdk-lib/aws-lambda";
import {Construct} from "constructs";
import {CfnOutput, RemovalPolicy} from "aws-cdk-lib";
import {Configurator, DefaultConfigurator, Handler, HandlerOptions, NonMandatoryTaggingType} from "./microservice";

type Builder<T> = (c: Construct) => T

// trying this.
type LambdaTriggerFactoriesType = {
    [K in keyof UserPoolTriggers]: Builder<Function>
}
export type UserPoolHandlerProps = Omit<UserPoolProps, "lambdaTriggers"> & {
    tags?: NonMandatoryTaggingType,
    lambdaTriggerFactories?: LambdaTriggerFactoriesType,
}

export class CognitoHandler implements Handler {

    constructor(private data: UserPoolHandlerProps) {
    }

    handle(config: HandlerOptions): Configurator {

        const userPool = new UserPool(config.parentConstruct, "user-pool", {
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
                .addEnvironment("cognitoUserPool", userPool.userPoolArn)
                .addEnvironment("cognitoClient", client.userPoolClientId)

            userPool.addTrigger(UserPoolOperation.of(name), trigger)
            return trigger;
        })

        return new CognitoConfigurator(userPool.userPoolId, userPool, functions);
    }

    static create(props: UserPoolHandlerProps) {
        return new CognitoHandler(props)
    }
}


export class CognitoConfigurator extends DefaultConfigurator {

    constructor(id: string, private pool: UserPool, private functions: Function[]) {
        super(id)
    }

    wantEnvironment(z: Configurator) {
        z.setEnvironment((k, v) => this.functions.forEach(funk => funk.addEnvironment(k, v)));
    }

    setEnvironment(setter: (key: string, value: string) => void) {

        setter(`cognitoPool`, `${this.pool.userPoolArn}`)
    }
}