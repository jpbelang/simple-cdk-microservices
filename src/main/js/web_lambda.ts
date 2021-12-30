
import {Configurator, DefaultConfigurator, Handler, HandlerOptions} from "./microservice";
import {Function, FunctionProps} from "@aws-cdk/aws-lambda";
import {
    BasePathMapping,
    CorsOptions,
    DomainName,
    IResource,
    LambdaIntegration,
    LambdaRestApi
} from "@aws-cdk/aws-apigateway";
import * as lambda from "@aws-cdk/aws-lambda";
import {Optional} from "typescript-optional";
import {BaseEnvironmentInfo, configureFunction, EnvironmentInfo, LambdaSupportProps} from "./lambda_support";

export type EnumeratedApiProps = {
    resourceTree: ResourceTree
    topResource: IResource
}
export type DelegatedApiProps = {
    environmentInfo?: BaseEnvironmentInfo
    resourceTree: null
    basePath: string
    defaultCorsPreflightOptions?: CorsOptions
}


export type WebHandlerData = (EnumeratedApiProps|DelegatedApiProps) & LambdaSupportProps

type MethodIntegrator = (methodName: string, resource: IResource, func: Function ) => void
type ResourceIntegrator = (methodName: string, resource: IResource, func: Function ) => [IResource, ResourceTree]
type ResourceTree = { [key: string]: ResourceTree|MethodIntegrator|ResourceIntegrator }

export function simpleMethod():  MethodIntegrator {

    return (m,r, f) => {

        r.addMethod(m, new LambdaIntegration(f))
    }
}

export function simpleResource(built: ResourceTree):  ResourceIntegrator {

    return (m,r, f) => {

        const newResource = r.addResource(m)
        return [r, built]
    }
}

export function configureTree(func: Function, resource: IResource, tree: ResourceTree) {

    Object.entries(tree).forEach(
        ([key, treeOrIntegrator]) => {
            if ( /(GET)|(POST)|(PUT)|(DELETE)/.test(key)) {
                // we should have a function.  Type
                if ( typeof  treeOrIntegrator == "function") {
                    treeOrIntegrator(key, resource, func)
                }
            } else {

                if ( typeof  treeOrIntegrator == "function") {
                    const integrator = treeOrIntegrator as ResourceIntegrator
                    const values = integrator(key, resource, func)
                    configureTree(func, values[0], values[1])
                } else {
                    const newResource = resource.addResource(key)
                    configureTree(func, newResource, treeOrIntegrator)
                }
            }
        })
}

export class WebLambda implements Handler {
    private readonly data: WebHandlerData;

    constructor(data: WebHandlerData) {
        this.data = data
    }

    handle(config: HandlerOptions): Configurator {

        let id = `${this.data.handler}`;
        const func = new Function(config.parentConstruct, id, this.data)
        configureFunction(this.data, config, func);

        if ( this.data.resourceTree != null) {
            configureTree(func, this.data.topResource, this.data.resourceTree)
        } else {

            const lra = new LambdaRestApi(config.parentConstruct, `${id}ApiGateway`, {
                handler: func,
                restApiName: `${config.parentName}-${this.data.basePath}`,
                defaultCorsPreflightOptions: this.data.defaultCorsPreflightOptions
            })

            if ( this.data.environmentInfo ) {
                const actualDomainName = this.data.environmentInfo;

                const domainName = DomainName.fromDomainNameAttributes(config.parentConstruct, "imported-domain", {
                    domainName: actualDomainName.hostName + "." + actualDomainName.domainName,
                    domainNameAliasHostedZoneId: this.data.environmentInfo.zoneId,
                    domainNameAliasTarget: actualDomainName.aliasTarget
                })

                const basePath = new BasePathMapping(config.parentConstruct, `${id}Mapping`, {
                    basePath: this.data.basePath,
                    restApi: lra,
                    domainName: domainName
                })
            }
        }

        return new WebLambdaConfigurator(id, func)
    }


    static create(data: WebHandlerData) {

        return new WebLambda(data)
    }
}

export class WebLambdaConfigurator extends DefaultConfigurator {

    private readonly func: Function;

    constructor(id: string, func: Function) {
        super(id);
        this.func = func;
    }

    wantEnvironment(z: Configurator) {
        z.setEnvironment((k, v) => this.func.addEnvironment(k, v))
    }

    wantSecurity(z: Configurator) {
        z.grantSecurityTo(this.func)
    }
}