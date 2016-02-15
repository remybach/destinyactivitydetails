# Destiny Activity Details

Source code for <http://destinyactivitydetails.com>.

This site - being all about the data - was built with form over function in mind,
thus the front end simply uses bootstrap for all styling/layout.

## Running

First, you'll need to get an [API key from Bungie.net](https://www.bungie.net/en/user/api).

Using an example with a custom port of `1234` (default is `5000`), and example
API key of `1a2b3c4d5e6f7g8h9i10j11k12l13m14`:

```shell
PORT=1234 BUNGIE_API_KEY=1a2b3c4d5e6f7g8h9i10j11k12l13m14 node index.js
```
