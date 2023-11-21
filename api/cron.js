import { response } from "express";

export default async function handler(request, response) {
    const result = await fetch(
      'http://worldtimeapi.org/api/timezone/America/Chicago',
    );
    const data = await result.json();
   
    return response.json({ datetime: data.datetime });
  }

// export default function handler(req, res) {
//     const url = 'https://gifbyme.glitch.com'
//     fetch(url)
//     .then(response => response.json)
//     .then(data => {console.log(data)});
//     res.status(200).end('Hello Cron!');
// }