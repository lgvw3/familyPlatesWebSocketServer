# Family Plates Web Socket Server

This enables the real time communications for the app. Since nextjs doesn't do long lived connections this is connected to via a webhook in the nextjs app on the client side.

Using an upstash redis instance to do pub/sub.