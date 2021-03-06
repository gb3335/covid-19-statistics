import React, { useState, useEffect } from "react";
import ReactEcharts from "echarts-for-react";
import echarts from "echarts/lib/echarts";
import "echarts/lib/component/tooltip";
import "echarts/lib/component/title";
import axios from "axios";
import { convertNameToMap } from "../hooks/helper";

export default function MapGlobal({ mapData }) {
	const [loaded, setReady] = useState(false);
	const [data, setData] = useState([]);

	useEffect(() => {
		let isCancelled = false;
		const source = axios.CancelToken.source();

		const getCountriesCases = async () => {
			const casesResult = await axios.get(`./assets/GlobalCasesToday.json`);
			let dataWithInfectRate = casesResult.data.countries.map(
				({ name, total, active, increased, recovered, dead, perMppl }) => {
					let lethality = "0%";
					let deadCount = parseInt(dead.trim().replace(/,/g, ""));
					let totalCount = parseInt(total.trim().replace(/,/g, ""));
					// console.log(name, ':', dead, deadCount, total, totalCount)
					if (deadCount > 0) {
						lethality = ((100 * deadCount) / totalCount).toFixed(2) + "%";
						lethality = lethality.replace(/([\d]{1,2}).00%/, "$1%");
					}

					return {
						name: convertNameToMap(name),
						value: perMppl ? perMppl.replace(/,/g, "") : "1",
						activeCount: active.replace(/,/g, ""),
						confirmedCount: total.replace(/,/g, ""),
						increasedCount: increased.replace(/,/g, ""),
						curedCount: recovered.replace(/,/g, ""),
						deadCount: dead.replace(/,/g, ""),
						lethality: lethality
					};
				}
			);

			setData(dataWithInfectRate);
			setReady(true); // needed for avoid the rendering when clicking on Global tab again
		};

		import(`echarts/map/json/world.json`)
			.then(map => {
				echarts.registerMap("world", map.default);
				if (!isCancelled) {
					getCountriesCases();
					// setReady(true);
				}
			})
			.catch(error => console.log(error));

		return () => {
			source.cancel();
			isCancelled = true;
		};
	}, []);

	const getLoadingOption = () => {
		return {
			text: "Data Loading ..."
		};
	};

	const onChartReady = (chart, loaded) => {
		// if(loaded)
		setTimeout(() => {
			chart.hideLoading();
		}, 1000);
		// chart.hideLoading();
	};

	const getOption = () => {
		return {
			// backgroundColor: '#C0C0C0',
			title: {
				x: "center",
				text: "Cases by country (clickable) Worldwide",
				subtext: "Data from https://www.worldometers.info/coronavirus/",
				margin: "10px",
				textStyle: { fontSize: 18 }
			},
			visualMap: {
				show: true,
				type: "piecewise",
				min: 0,
				max: 100000,
				align: "left",
				top: "5%",
				left: "center",
				inRange: { color: ["#ffc0b1", "#ff8c71", "#ef1717", "#9c0505"] },
				// cases number ranges: greater number indicates more severe epidemic area
				pieces: [
					{ min: 1000 },
					{ min: 500, max: 999 },
					{ min: 200, max: 499 },
					{ min: 50, max: 199 },
					{ min: 0, max: 49 }
				],
				padding: 35,
				orient: "horizontal",
				showLabel: true,
				text: ["Outbreak", "Cases per 1M people"],
				itemWidth: 10,
				itemHeight: 10,
				textStyle: { fontSize: 12, fontWeight: "bold" }
			},
			tooltip: {
				formatter: ({ name, value, data }) => {
					if (!data) {
						return `<b>${name}</b><br />Confirmed: ${value || "No Case"}`;
					}

					let {
						activeCount,
						confirmedCount,
						curedCount,
						deadCount,
						lethality
					} = data;
					const valueFormat = value => {
						return (value || "0")
							.toString()
							.trim()
							.replace(/(\d{1,3})(?=(?:\d{3})+(?!\d))/g, "$1,");
					};

					let tipString = `<b>${name}</b><br />
                        Per 1M ppl: ${valueFormat(value)}<br />
                        Confirmed:\t${valueFormat(confirmedCount)}<br />
                        Active: ${valueFormat(activeCount)}<br />
                        Cured:\t${valueFormat(curedCount)}<br />
                        Death:\t${valueFormat(parseInt(deadCount))}<br />
                        Lethality:\t${lethality}`;
					return tipString;
				}
			},
			// geo: {  },
			series: [
				{
					left: "3%",
					right: "5%",
					top: "18%",
					bottom: "7%", // similar to grid property
					type: "map",
					// name: 'Confirmed Cases',
					geoIndex: 0,
					data: data, // area(countries) data
					map: "world",
					// the following attributes can be put in geo, but the map will smaller
					// and cannot be zoomed out
					silent: false, // country area is clickable
					label: {
						normal: {
							show: false, // do not show country name
							fontSize: 16,
							color: "rgba(0,0,0,0.7)" // default area color
						}
					},
					itemStyle: {
						normal: {
							borderColor: "rgba(0, 0, 0, 0.2)",
							areaColor: "#B2E5BC" // default area color
						},
						emphasis: {
							areaColor: "#53adf3", // change color when click
							shadowOffsetX: 0,
							shadowOffsetY: 0,
							shadowBlur: 20,
							borderWidth: 0,
							shadowColor: "rgba(0, 0, 0, 0.5)"
						}
					},
					mapType: "world",
					zoom: 1.0,
					roam: false,
					showLegendSymbol: false,
					rippleEffect: {
						show: true,
						brushType: "stroke",
						scale: 2.5,
						period: 4
					}
				}
			]
		};
	};

	const getModerateHeight = () => {
		let mediaQuery = window.matchMedia("(orientation: portrait)");
		// console.log('sss', mediaQuery);
		if (mediaQuery.matches) {
			// if(document.body.clientWidth < 1024) {
			return "48vh";
			// }
		}
		return "85vh";
	};

	// console.log('width height', document.body.clientWidth, document.body.clientHeight);
	return (
		<ReactEcharts
			style={{ height: getModerateHeight() }}
			echarts={echarts}
			option={getOption()}
			loadingOption={getLoadingOption()}
			onChartReady={onChartReady}
			showLoading={!loaded}
			notMerge={true}
			lazyUpdate={true}
			theme={"theme_name"}
			// onEvents={EventsDict}
			// opts={}
		/>
	);
}
