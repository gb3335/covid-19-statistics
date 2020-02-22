import { useEffect, useReducer } from "react";
import axios from "axios";
import moment from 'moment';
import { filter, pick, orderBy } from 'lodash';

import reducer, { 
  SET_LOAD_STATUS, 
  SET_OTHER_OVERALL, 
  SET_CHINA_OVERALL, 
  SET_GLOBAL_OVERALL, 
  SET_GLOBAL_MAP, 
  SET_CHINA_MAP,
  SET_GLOBAL_TABLE } from "./reducer";

export default function useAppData(props) {

  const initialData = { 
    loaded: false, 
    mapData: [], 
    tableData: []
  };
  const [covidData, dispatch] = useReducer(reducer, initialData);

  const getUpdateTime = (data) => {
    let time = moment.unix(data[0].updateTime/1000).toString();
    return moment(time).format("YYYY-MM-DD HH:mm:ss");
  };

  //history data is for line charts
  const getHisData = () => {

  }

  // overall data without China
  const getOverall = (data, updateTime) => {      
    let cases = { 
      currentConfirmedCount: 0, 
      confirmedCount: 0, 
      suspectedCount: 0, 
      curedCount: 0, 
      deadCount: 0
    };

    for(const country of data) {
      if(country.countryEnglishName) {
        cases.confirmedCount += country.confirmedCount;
        cases.currentConfirmedCount += country.currentConfirmedCount;
        cases.curedCount += country.curedCount;
        cases.deadCount += country.deadCount;
        cases.suspectedCount += country.suspectedCount;
      }
    }      

    return { 
      time: updateTime,
      confirmed: cases.confirmedCount, 
      suspect: cases.suspectedCount,
      cured: cases.curedCount, 
      death: cases.deadCount,
      fatality: (100 * cases.deadCount / (cases.confirmedCount + cases.curedCount)).toFixed(2) + '%'
    };
  }

  const getGlobalMapData = (chinaData, data) => {

    let chinaCases = { 
      countryEnglishName: 'China', 
      currentConfirmedCount: 0, 
      confirmedCount: 0, 
      suspectedCount: 0, 
      curedCount: 0, 
      deadCount: 0
    };

    for(const prov of chinaData) {
      chinaCases.confirmedCount += prov.confirmedCount;
      chinaCases.currentConfirmedCount += prov.currentConfirmedCount;
      chinaCases.curedCount += prov.curedCount;
      chinaCases.deadCount += prov.deadCount;
      chinaCases.suspectedCount += prov.suspectedCount;
    }

    let countriesData = data.map((country) => { 
      if(country.countryName === "阿联酋") {
        country.countryEnglishName = "United Arab Emirates";
      }
      return pick(country, "countryEnglishName", "confirmedCount", 
      "currentConfirmedCount", "suspectedCount", "curedCount", "deadCount")} 
    );
    
    let countriesDataWithChina = countriesData.map((country) => {          
      if(country.countryEnglishName === "United States of America") {
        country.countryEnglishName = "United States";
      }

      if(country.countryEnglishName) {
        return {name: country.countryEnglishName, value: country.confirmedCount};
      }
    });
    countriesDataWithChina.push({name: 'China', value: chinaCases.confirmedCount});

    return countriesDataWithChina;
  }

  const getTableData = (chinaData, otherCountries) => {

    let chinaCases = { 
      countryEnglishName: 'China', 
      currentConfirmedCount: 0, 
      confirmedCount: 0, 
      suspectedCount: 0, 
      curedCount: 0, 
      deadCount: 0
    };

    for(const prov of chinaData) {
      chinaCases.confirmedCount += prov.confirmedCount;
      chinaCases.currentConfirmedCount += prov.currentConfirmedCount;
      chinaCases.curedCount += prov.curedCount;
      chinaCases.deadCount += prov.deadCount;
      chinaCases.suspectedCount += prov.suspectedCount;
    }

    let countriesData = otherCountries.map((country) => { 
      return pick(country, "countryEnglishName", "confirmedCount", 
      "currentConfirmedCount", "suspectedCount", "curedCount", "deadCount");        
    });

    countriesData.push(chinaCases);
    let rowsData = filter(countriesData, (data) => { return (data.countryEnglishName); });
    return orderBy(rowsData, ['confirmedCount', 'curedCount', 'countryEnglishName'], ['desc', 'desc', 'asc']);   
  }

  useEffect(() => {

    // latest data of all places in the world
    axios.get('https://lab.isaaclin.cn/nCoV/api/area').then((data)=> {
      
      let chinaData = filter(data.data.results, ({cities})=>{ return (Array.isArray(cities)) });
      let otherCountries = filter(data.data.results, ({cities})=>{ return (!Array.isArray(cities)) });

      // spectial process of unmatched data with map geo
      for(const country of otherCountries) {
        if(country.countryName === "钻石公主号邮轮") {
          country.countryEnglishName = 'Diamond Princess Cruise'
        }        
        if(country.countryName === "阿联酋") {
          country.countryEnglishName = "United Arab Emirates";
        }
        if(country.countryEnglishName === "United States of America") {
          country.countryEnglishName = "United States";
        }
      }

      let updateTime = getUpdateTime(data.data.results);
      let chinaOverall = getOverall(chinaData, updateTime);
      let otherOverall = getOverall(otherCountries, updateTime);
      let globalOverall = getOverall([...chinaData, ...otherCountries], updateTime);

      let globalMapData = getGlobalMapData(chinaData, otherCountries);
      let tableData = getTableData(chinaData, otherCountries);
      dispatch({type: SET_LOAD_STATUS, loaded: true});
      dispatch({type: SET_OTHER_OVERALL, otherToll: otherOverall});
      dispatch({type: SET_CHINA_OVERALL, chinaToll: chinaOverall});
      dispatch({type: SET_GLOBAL_OVERALL, globalToll: globalOverall});
      console.log(globalOverall);
      dispatch({type: SET_GLOBAL_MAP, globalMap: globalMapData});
      // dispatch({type: SET_CHINA_MAP, chinaMap: mapData});
      dispatch({type: SET_GLOBAL_TABLE, tableData: tableData})

    }).catch(e => console.log('Request global data:', e));

    // request for history data
    axios.get('https://lab.isaaclin.cn/nCoV/api/area?latest=0', 
      { headers: {'Access-Control-Allow-Origin': '*'} }).then((data)=> {
      console.log('hisdata', data.data.results);
    });

  }, []);

  return covidData;
}