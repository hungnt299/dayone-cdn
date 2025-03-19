import * as cloudfront from '@aws-cdk/aws-cloudfront'
import * as route53 from '@aws-cdk/aws-route53'
import * as targets from '@aws-cdk/aws-route53-targets'
import * as s3 from '@aws-cdk/aws-s3'
import * as cdk from '@aws-cdk/core'
import * as acm from '@aws-cdk/aws-certificatemanager'
import * as s3deploy from '@aws-cdk/aws-s3-deployment'

const SITE_URL = ''

export class Stack extends cdk.Stack {
    contructor(scope: cdk.Construct, id: string) {
        super(scope, id, {
            env: {
                account: process.env.CDK_DEFAULT_ACCOUNT,
                region: process.env.CDK_DEFAULT_REGION,
            }
        })

        // HostedZone
        const zone = route53.HostedZone.fromLookup(this, 'Zone', {
            domainName: 'developright.co.uk'
        })

        // S3 Bucket  (Store file in)
        const siteBucket  = new s3.Bucket(this, 'SiteBucket', {
            bucketName: SITE_URL,
            websiteIndexDocument: 'index.html',
            publicReadAccess: true,
            removePolicies: cdk.RemovalPolicy.DESTROY,
        })

        // Certificate ARN  (For cloudfront)
        const certificateArn = new acm.DnsValidatedCertificate(this, 'SiteCertificate', {
            domainName: SITE_URL,
            hostedZone: zone,
            region: 'us-east-1',
        }).certificateArn

        // Distribution cloudfront
        const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
            aliasConfiguration: {
                acmCertRef: certificateArn,
                names: [SITE_URL],
                sslMethod: cloudfront.SSLMethod.SNI,
                securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016
            },
            originConfigs: [
                {
                    customOriginSource: {
                        domainName: siteBucket.bucketWebsiteDomainName,
                        originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY
                    },
                    behaviors: [
                        {
                            isDefaultBehavior: true
                        }
                    ]
                }
            ]
        })

        // A record
        new route53.ARecord(this, 'SiteAliasRecord', {
            recordName: SITE_URL,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            zone,
        })

        new s3deploy.BucketDeployment(this, 'DeployToBucket', {
            sources: [s3deploy.Source.asset('./.next/static')],
            destinationBucket: siteBucket,
            distribution,
            distributionPaths: ['/*']
        })
    }
}