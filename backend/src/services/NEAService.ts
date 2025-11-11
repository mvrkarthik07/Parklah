import { forecasts } from '../adapters/NEAWeatherAdapter.js'
export function getForecast(lat: number, lng: number) { return forecasts(lat,
lng) }
