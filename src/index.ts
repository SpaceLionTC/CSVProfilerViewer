/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2023 Lars Sjodin, Hati Hati Games AB
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
*/

import {parse, ParseResult} from "papaparse";
import {Chart} from "chart.js/auto";
import zoomPlugin from 'chartjs-plugin-zoom';
import "./PerformanceComparisonElement";
import {PerformanceComparisonElement} from "./PerformanceComparisonElement";
import "./FrameTimeElement";
import {FrameTimeElement} from "./FrameTimeElement";
import "./MiniMapElement";
import {MiniMapElement} from "./MiniMapElement";
import {HTML} from "./HTML";
import axios, {AxiosResponse} from "axios";

const  MAX_FRAMES_TO_PROCESS: number = 2147483647;

let aggregateStats = [
    {
        displayName: "Frame Time",
        addLabels: ["GameThread/FEngineLoopTick"],
        subtractLabels: [],
    },
    {
        displayName: "\xa0\xa0\xa0\xa0Net Tick Time",
        addLabels: ["GameThread/NetTickTime"],
        subtractLabels: []
    },
    {
        displayName: "\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0Spawning",
        addLabels: ["GameThread/ActorSpawning"],
        subtractLabels: []
    }, 
    {
        displayName: "\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0Net Tick Time Misc",
        addLabels: ["GameThread/NetTickTime"],
        subtractLabels: ["GameThread/ActorSpawning"]
    }, 
    {
        displayName: "\xa0\xa0\xa0\xa0Async Loading",
        addLabels: ["GameThread/ProcessAsyncLoading"],
        subtractLabels: []
    },
    {
        displayName: "\xa0\xa0\xa0\xa0Game Tick Time",
        addLabels: ["GameThread/GameEngineTick"],
        subtractLabels: []
    }, 
    {
        displayName: "\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0Hero Characters",
        addLabels: ["LokiHeroCharacter/GameThread/ALokiHeroCharacterTick"],
        subtractLabels: []
    },
    {
        displayName: "\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0VisionGranters",
        addLabels: ["VisionGranter/GameThread/Tick"],
        subtractLabels: []
    },
    {
        displayName: "\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0Projectiles",
        addLabels: ["LokiProjectile/GameThread/MovementComponentTick"],
        subtractLabels: []
    },
    {
        displayName: "\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0VFX",
        addLabels: ["Exclusive/GameThread/Effects"],
        subtractLabels: []
    },
    {
        displayName: "\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0Skeletal Mesh",
        addLabels: ["Exclusive/GameThread/Animation"],
        subtractLabels: []
    },
    {
        displayName: "\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0Character Movement",
        addLabels : ["CharacterMovement/GameThread/Tick"],
        subtractLabels: []
    },
    {
        displayName: "\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0Game Tick Time Misc",
        addLabels : ["GameThread/GameEngineTick"],
        subtractLabels: ["LokiHeroCharacter/GameThread/ALokiHeroCharacterTick", "VisionGranter/GameThread/Tick", "LokiProjectile/GameThread/MovementComponentTick", "Exclusive/GameThread/Effects", "Exclusive/GameThread/Animation", "CharacterMovement/GameThread/Tick"],
    },
    {
        displayName: "\xa0\xa0\xa0\xa0Garbage Collection",
        addLabels: ["GameThread/ConditionalCollectGarbage"],
        subtractLabels: []
    },
    {
        displayName: "\xa0\xa0\xa0\xa0Redraw Viewports",
        addLabels: ["GameThread/RedrawViewports"],
        subtractLabels: []
    },
    {
        displayName: "\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0Level Streaming",
        addLabels : ["GameThread/UpdateLevelStreaming"],
        subtractLabels: []
    },
    {
        displayName: "\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0Redraw Viewports Misc",
        addLabels: ["GameThread/RedrawViewports"],
        subtractLabels: ["GameThread/UpdateLevelStreaming"]
    }, 
    {
        displayName: "\xa0\xa0\xa0\xa0Slate Tick",
        addLabels: ["Slate/GameThread/Tick"],
        subtractLabels: []
    },
    {
        displayName: "\xa0\xa0\xa0\xa0Misc",
        addLabels: ["GameThread/FEngineLoopTick"],
        subtractLabels: ["GameThread/NetTickTime", "GameThread/ProcessAsyncLoading", "GameThread/GameEngineTick", "GameThread/ConditionalCollectGarbage", "GameThread/RedrawViewports", "Slate/GameThread/Tick"]
    }
]

let tabs = [{
    thread:"GameThread/",
    label: "GameThread",
    digits:3,
    suffix: " ms"
}, {
    thread:"RenderThread/",
    label: "RenderThread",
    digits:3,
    suffix: " ms"
}, {
    thread:"/.*Worker.*/",
    label: "Physics",
    digits:3,
    suffix: " ms"
},{
    thread:"FileIO/",
    label: "FileIO",
    digits:1,
    suffix: ""
}, {
    thread:"ActorCount/",
    label: "ActorCount",
    digits:0,
    suffix: ""
}, {
    thread:"Ticks/",
    label: "Ticks",
    digits:0,
    suffix: ""
}, {
    thread:"DrawCall/",
    label: "DrawCall",
    digits:0,
    suffix: ""
}, {
    thread:"Profiler/",
    label: "Profiling meters",
    digits:0,
    suffix: ""
}, {
    thread:"View/",
    label: "View",
    digits:1,
    suffix: ""
}];
let comparisons: PerformanceComparisonElement[] = []
let lastCsv = "";
let mainChartElement = HTML.tag("div", {class:"frame-times-chart"}, "");
let urlInput = HTML.tag('input', {type:"file", class:"file-input", "id":"file-input"},"");
let urlLabel = HTML.tag('label', {for:"file-input"}, "Input: ");
document.body.appendChild(urlLabel);
document.body.appendChild(urlInput);

let canvas = document.createElement("canvas");
mainChartElement.appendChild(canvas);
Chart.register(zoomPlugin);
let frametimeElement : FrameTimeElement = HTML.tag("frame-time", {class:"frame-time-chart"}, "");
let topRowElement: HTMLDivElement = HTML.tag("div", {class:"top-row"},"");
topRowElement.appendChild(mainChartElement);
topRowElement.appendChild(frametimeElement);
document.body.appendChild(topRowElement);


let tabsDiv = HTML.tag("div", {}, "");
let miniMap = HTML.tag("mini-map", {}, "");
let bottomRowElement = HTML.tag("div", {class:"top-row"},"");
topRowElement.appendChild(tabsDiv);
topRowElement.appendChild(miniMap);
document.body.appendChild(bottomRowElement);

tabs.forEach( (config, index) => {
    tabsDiv.appendChild(HTML.tag("input", {class: "tabview", type:"radio", "checked": index==0?"true":null, name:"tabs", id:"tab"+(index+1)}, ""));
    tabsDiv.appendChild(HTML.tag("label",{class: "tabview", for:"tab"+(index+1)},config.label));
});
tabs.forEach( (config, index) => {
    let comparisonElement: PerformanceComparisonElement = HTML.tag('performance-comparison',{
        thread:config.thread,
        digits:config.digits,
        suffix:config.suffix,
        class:"tab content"+(index+1)},"");
    tabsDiv.appendChild(comparisonElement);
    comparisons.push(comparisonElement);
})

async function run()
{
    let csvString : string = lastCsv;
    // Useful test url when running locally is http://localhost:4000/?csv=testdata.csv
    let csvQueryParam = new URLSearchParams(window.location.search).get("csv");
    if (csvQueryParam) {
        try {
            let response: AxiosResponse<string> = await axios.get(csvQueryParam);
            if (response.status >= 200 && response.status < 300) {
                csvString = response.data;
            }
        } catch (e) {
        }
    }

    if (csvString.length>0) {
        let preprocessedString = csvString.split('\n');
        // Second to last row has the correct headers in this case.
        if (preprocessedString[preprocessedString.length - 1].startsWith("[HasHeaderRowAtEnd]"))
        {
            preprocessedString[0] = preprocessedString[preprocessedString.length - 2];
            preprocessedString.pop();
            preprocessedString.pop();
        }
        else {
            document.body.appendChild(HTML.tag("div", {}, "WARNING : Final headers were not written, make sure traces end gracefully by not shutting down the process prematurely to prevent data loss."))
        }

        let table: ParseResult<{ [key: string]: string }> = parse(preprocessedString.join('\n'), {header:true});
        let frameTimeSeries : number[] = [];
        let gameThreadTimeSeries : number[] = [];
        let chaosTimeSeries : number[] = [];
        let perFrameKBTimeSeries : number[] = [];
        let renderThreadTimeSeries : number[] = [];
        let frameNumberLabels : number[] = [];
        let aggregateStatValues : Map<string, number[]> = new Map<string, number[]>();
        let aggregateStatHadNegativeValue : boolean = false;

        aggregateStats.forEach( (aggregateStat) => {
                let newArray: number[] = [];
                aggregateStatValues.set(aggregateStat.displayName, newArray);
        });

        for (let frameNumber = 0; frameNumber<Math.min(MAX_FRAMES_TO_PROCESS,table.data.length); ++frameNumber) {
            frameTimeSeries.push(Number.parseFloat(table.data[frameNumber]["FrameTime"]));
            gameThreadTimeSeries.push(Number.parseFloat(table.data[frameNumber]["GameThreadTime"]));
            renderThreadTimeSeries.push(Number.parseFloat(table.data[frameNumber]["RenderThreadTime"]));
            perFrameKBTimeSeries.push(Number.parseFloat(table.data[frameNumber]["FileIO/PerFrameKB"]));
        
            aggregateStats.forEach( (aggregateStat) => {
                let hasValidAggregate = false;
                let aggregateValue = 0.0;

                aggregateStat.addLabels.forEach((label) =>
                {
                    let value : number = Number.parseFloat(table.data[frameNumber][label]);
                    if (!isNaN(value) && value >= 0.0)
                    {
                        aggregateValue += value;
                        hasValidAggregate = true;
                    }
                });

                aggregateStat.subtractLabels.forEach((label) =>
                {
                    let value : number = Number.parseFloat(table.data[frameNumber][label]);
                    if (!isNaN(value))
                    {
                        aggregateValue -= value;
                    }
                });

                if (hasValidAggregate)
                {
                    if (aggregateValue < 0.0)
                    {
                        aggregateStatHadNegativeValue = true;

                        console.log(`FrameNumber : ${frameNumber} DisplayName : ${aggregateStat.displayName}`);
                        aggregateStat.addLabels.forEach((label) =>
                            {
                                let value : number = Number.parseFloat(table.data[frameNumber][label]);
                                if (!isNaN(value) && value >= 0.0)
                                {
                                    console.log(`AddValue : ${value}`);
                                }
                            });
            
                            aggregateStat.subtractLabels.forEach((label) =>
                            {
                                let value : number = Number.parseFloat(table.data[frameNumber][label]);
                                if (!isNaN(value))
                                {
                                    console.log(`SubtractValue : ${value}`);
                                }
                            });
                        
                    }
                    aggregateStatValues.get(aggregateStat.displayName)!.push(Math.max(0.0, aggregateValue));
                }
            })

            let chaosTime : number = 0;
            table.meta.fields?.forEach((columnLabel) => {
                if (columnLabel.match(/Chaos.*Worker.*/) || columnLabel.match(/Exclusive.*Physics/)) {
                    chaosTime += Number.parseFloat(table.data[frameNumber][columnLabel]);
                }
            });
            chaosTimeSeries.push(chaosTime);
            frameNumberLabels.push(frameNumber);
        }

        
        if (aggregateStatHadNegativeValue)
        {
            document.body.appendChild(HTML.tag("div", {}, `*Found frames with negative aggregate values. Please review log before accepting results as accurate.*`))
        }
        aggregateStatValues.forEach((value: number[] , key: string ) => {
            if (value.length > 0)
            {
                value = value.sort((a,b) => a-b);
                let median = value[Math.floor(value.length / 2)].toFixed(2);
                let avg = (value.reduce((a, b) => a + b) / value.length).toFixed(2);
                let percentile2 = value[Math.floor(value.length * 0.02)].toFixed(2);
                let percentile98 = value[Math.floor(value.length * 0.98)].toFixed(2);
                let max = value[value.length - 1].toFixed(2);

                document.body.appendChild(HTML.tag("div", {}, `${key} - (2% : ${percentile2}ms, Avg : ${avg}ms, Med : ${median}ms, 98% : ${percentile98}ms, Max : ${max}ms)`))
            }
            else
            {
                document.body.appendChild(HTML.tag("div", {}, `WARNING : ${key} had no values`))
            }
            
        });


        comparisons.forEach(comparison => {comparison.setTable(table)})
        frametimeElement.setTable(table);
        miniMap.setTable(table);
        new Chart(
            canvas,
            {
                options: {
                    animation: false,
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                        datalabels : {
                            display: false,
                        },
                        zoom: {
                            zoom: {
                                wheel: {
                                    enabled: true,
                                },
                                pinch: {
                                    enabled: true
                                },
                                mode: 'x',
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Frame #'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'FrameTime (ms)'
                            },
                            ticks: {
                                callback: function(value, index, ticks) {
                                    return value + " ms";
                                }
                            }
                        },
                        kb: {
                            type: 'linear',
                             grid: { display: false },

                            position: 'right',
                            title: {
                                display: true,
                                text: 'Loaded (KB)'
                            },
                            ticks: {
                                callback: function(value, index, ticks) {
                                    return value + " KB";
                                }
                            }
                        }
                    },
                    onClick: (event, elements, chart) => {
                        if (elements[0]) {
                            const frameNumber = elements[0].index;
                            comparisons.forEach(comparison => {comparison.addComparison(frameNumber)})
                        }
                    }
                },
                type: 'line',
                data: {
                    labels: frameNumberLabels,
                    datasets: [
                        {
                            label: 'Frame time (ms)',
                            data: frameTimeSeries
                        },
                        {
                            label: 'Game Thread (ms)',
                            data: gameThreadTimeSeries
                        },
                        {
                            label: 'Render Thread (ms)',
                            data: renderThreadTimeSeries
                        },
                        {
                            label: 'Physics+Chaos, All threads total (ms)',
                            data: chaosTimeSeries
                        },
                        {
                            type: 'bar',
                            barPercentage: 1.3,
                            yAxisID: 'kb', // <-- the Y axis to use for this data set
                            label: 'Per frame loaded (KB)',
                            data: perFrameKBTimeSeries
                        }
                    ]
                }
            }
        );
    }
}

urlInput.addEventListener("change", (e) => {

        if (!e.target) {
            return;
        }
        if (e.target instanceof HTMLInputElement && e.target.files)  {
            var file = e.target.files[0];
            var reader = new FileReader();
            reader.readAsText(file,'UTF-8');
            reader.onload = readerEvent => {
                if (readerEvent.target) {
                    var content = readerEvent.target.result;
                    if (!content) {
                        return;
                    }
                    if (content instanceof ArrayBuffer) {
                        // Shouldn't be an ArrayBuffer
                    } else
                    {
                        lastCsv =  content;
                        run().then()

                    }
                }
            }



    }
});

run().then()
