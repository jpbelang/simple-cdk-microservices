import * as cdk from 'aws-cdk-lib';
import * as Example from '../lib/example-stack';
import {Template} from "aws-cdk-lib/assertions";

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Example.ExampleStack(app, 'MyTestStack');
    // THEN
    const template = Template.fromStack(stack);

});
