import { forecasts } from '../adapters/NEAWeatherAdapter'
export function getForecast(lat: number, lng: number) { return forecasts(lat,
lng) }
