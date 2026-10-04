import production from '../vite.config';
import {defineConfig} from 'vite';
const destinations:Record<string,string>={
 'https://control.bloodydaves.com':'/bloody-daves/',
 'https://weather.bloodydaves.com':'/fishin/',
 'https://recipes.bloodydaves.com':'/recipes/',
 'https://pantry.bloodydaves.com':'/pantry/',
 'https://list.bloodydaves.com':'/shoppy/',
 'https://lift.bloodydaves.com':'/training/',
};
export default defineConfig({...production,base:'/fishin/',plugins:[...(production.plugins||[]),{
 name:'nas-local-routing',enforce:'pre',transform(code,id){
  if(id.includes('/node_modules/'))return;
  if(id.endsWith('/App.tsx'))code=code.replace('import { Route, Switch }', 'import { Router as NasRouter, Route, Switch }').replace('<Router />','<NasRouter base="/fishin"><Router /></NasRouter>');
  for(const [from,to]of Object.entries(destinations))code=code.replaceAll(from,to);
  return code.replace('`/official-marine?', '`/fishin/official-marine?');
 },
}]});
