import {
    UserPool,
    UserPoolClientIdentityProvider,
    UserPoolClientOptions,
    UserPoolProps,
    UserPoolTriggers
} from "aws-cdk-lib/aws-cognito";
import {Optional} from "typescript-optional";
import {IFunction} from "aws-cdk-lib/aws-lambda";
import {Construct} from "constructs";
import {CfnOutput, RemovalPolicy} from "aws-cdk-lib";
import {Configurator, DefaultConfigurator, Handler, HandlerOptions, NonMandatoryTaggingType} from "./microservice";

type Builder<T> = (c: Construct) => T

// trying this.
type LambdaTriggerFactoriesType = {
    [K in keyof UserPoolTriggers]: Builder<IFunction>
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
            lambdaTriggers: {
                preSignUp: Optional.ofNullable(this.data.lambdaTriggerFactories).map(x => x.preSignUp).map(x => x(config.parentConstruct)).orUndefined()
            },
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

        return new CognitoConfigurator(userPool.userPoolId, userPool);
    }

    static create(props: UserPoolHandlerProps) {
        return new CognitoHandler(props)
    }
}


export class CognitoConfigurator extends DefaultConfigurator {

    constructor(id:string, private pool: UserPool) {
        super(id)
    }

    setEnvironment(setter: (key: string, value: string) => void) {

        setter(`cognitoPool`, `${this.pool.userPoolArn}`)
    }
}