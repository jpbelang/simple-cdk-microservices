import { SNSEvent, EventBridgeEvent, Handler } from 'aws-lambda';
import {CloudWatchLogs} from "aws-sdk";
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import tz from "dayjs/plugin/timezone";
import {emitKeypressEvents} from "readline";

dayjs.extend(utc)
dayjs.extend(tz)

const cloudwatchlogs = new CloudWatchLogs()

export function dateRange(): { from: Date, to: Date } {

    const now = dayjs()
    const end =  now.subtract(1, 'day').endOf("day").tz("GMT", true)
    const begin =  now.subtract(1, 'day').startOf("day").tz("GMT", true)

    return {
        from: begin.toDate(),
        to: end.toDate()
    }
}

const fooHandler: Handler<EventBridgeEvent<any, any>> = async (event) => {

    const range = dateRange();
    const exportresult = await cloudwatchlogs.createExportTask({
        taskName: `export ${range.from}-${range.to}`,destination: "", destinationPrefix: `${range.from}`, from: range.from.getTime(), logGroupName: "",  to: range.to.getTime()
    }).promise()

    console.log(`task started ${exportresult.taskId}`)
};