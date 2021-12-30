import {SNSEvent, SQSEvent} from "aws-lambda";
import {Optional} from "typescript-optional";


export enum EventType {
    NORMAL="normal",
    REPLAY="replay"
}

export interface EventMetadata {

    eventName(): string
    eventTime(): Date
    eventType(): EventType|string
    eventVersion(): string
}

export class DefaultMetadata implements EventMetadata {
    private date: Date;
    constructor(date: Date) {
        this.date = date;
    }

    eventName(): string {
        return "name";
    }

    eventTime(): Date {
        return this.date;
    }

    eventType(): EventType | string {
        return EventType.NORMAL;
    }

    eventVersion(): string {
        return "0";
    }

    static undefinedData(date: Date = new Date()) {
        return new DefaultMetadata(date)
    }
}

export class SNSEventMetadata implements EventMetadata {
    constructor(private event: SNSEvent, private defaultDate?: Date) {
    }

    eventName(): string {
        return Optional.ofNullable(this.event.Records[0].Sns.MessageAttributes["event-name"]).map( r => r.Value).orElse("_no_name_");
    }

    eventTime(): Date {
        return Optional.ofNullable(this.event.Records[0].Sns.MessageAttributes["event-time"]).map(s => new Date(s.Value)).orElseGet(() => Optional.ofNullable(this.defaultDate).orElse(new Date()));
    }

    eventType(): EventType|string {
        return Optional.ofNullable(this.event.Records[0].Sns.MessageAttributes["event-type"]).map( r => r.Value).orElse(EventType.NORMAL);
    }

    eventVersion(): string {
        return Optional.ofNullable(this.event.Records[0].EventVersion).orElse("0");
    }

    static fromEvent(event: SNSEvent, defaultDate?: Date) {
        return new SNSEventMetadata(event)
    }
}

export class SQSEventMetadata implements EventMetadata {
    constructor(private event: SQSEvent, private index: number, private defaultDate?: Date) {
        this.event = event;
    }

    eventName(): string {
        return Optional.ofNullable(this.event.Records[this.index].messageAttributes["event-name"]).map(s => s.stringValue).orElse("_no_name_");
    }

    eventTime(): Date {
        return Optional.ofNullable(this.event.Records[this.index].messageAttributes["event-time"]).map(s => s.stringValue).map(s => new Date(s)).orElseGet(() => Optional.ofNullable(this.defaultDate).orElse(new Date()));
    }

    eventType(): EventType|string {
        return Optional.ofNullable(this.event.Records[this.index].messageAttributes["event-type"]).map(s => s.stringValue).orElseGet(() => EventType.NORMAL);
    }

    eventVersion(): string {
        return Optional.ofNullable(this.event.Records[this.index].messageAttributes["event-version"]).map(s => s.stringValue).orElseGet(() => "0");
    }

    static fromEvent(event: SQSEvent, index: number, defaultDate?: Date) {
        return new SQSEventMetadata(event, index, defaultDate)
    }
}
