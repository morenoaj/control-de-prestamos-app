import admin from "firebase-admin";

if (!admin.apps.length) {
    console.log("📡 Inicializando Firebase Admin...");
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: "ppersonalapp",
            privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCvuPqFlyc8BIur\ng6BOaiXy1ne40tbm9RGUrMy9xZP+O3SMs80qWI3qiAE4uBJ2KYU/YyYBC9IehweC\nqFeQ2dGZj7M7dBDkFAFil3Iv5Uhxnoo+iEXq+OXd7YrNFlD++rFA2b3MYPkO1JVw\n9FHRmfDVk6lywsC1H6lZkSWOmt9h3GWHQ+Iv1BePibE+LbCmPhK2OC3WH59wU0B7\nw4gfDCq+E4NNGkyBzdy9QC3AiOR1ucoGImeIhCDlTf1vt8O29G0sTs957vztbqYt\n3z8ldds43HMZ7ZicNWL1JF+VMaklalmzgy+Vt6JqV00nnYtMiElHZgYRiDN5PRTe\nGU8O4wIJAgMBAAECggEASVeaDI8Jm6XEC+qsyn3IaAI2xwgNFSmdVGIJNH3WJqr3\nGtDi5XU/im+Inv1JC1OKH2pJDu+5m+885b5Qig83yfGt27c2Y5Or/lP6n14B7hY/\nWhkzoX6QJqBCKhZR6RKGT+xxqO+ilBuLYjE/Qw4O9H2koFcD6rUT0GPh+pLOgH+0\ngFJNmXEv0VIA+y5RF2NbLG+WvQznyNWRnHrEgTBceFLP0m9QF3fgBEKRww2vjYR9\nGf+aJDMRywFNtW1CjbinrsQcq/MfuoRyZbnMcjy5zr8SfHzcKM2ctqXb2LBQtTEs\n1MHN6fKRXN9ClHxPTqInzxliMxo5jvnrkIkXNBpKPwKBgQDoY/Yrf9U3EOPleatq\n5clGKnOBLHbbVriQWnGppX8mc8qH3RsKx2ycyeKnhh5uu2wwBDTavOh5xabqhrDr\n6b/CiVQrOR7kYCxTj5sDhIYfUd0rBe02gMuyN0GMNj84Y1Vh245zx1VELojdth1j\nzNDMJp6UpOQ7RBw7UDF2l1KJzwKBgQDBkzEOqMgoS+e0G0ESIDtGDh4DazvUU4E3\n2ARYJqG+zr++8ZDYJHbAi8eZM8pLZTOqtW0M4QwiJ9rXRKkV0Gxaaso0eCUXmu9/\nMEhzw2djQmI+3k0hQeTxYuEClOePyHFBqufJ4TNZu4bc+53G/W0vFzssS20iTCpi\n3oWtZTYkpwKBgCOTkg8svcZ1Vn499ykhToPoYdBnrzZ6+zxWLEptZJ7NYTcVeVtY\nFl+WZJWC6cvH85MSQcku3GQwBxKmVhV3rnyoq3MGhp0tv/t246NROXs3/CTm/l62\nrvh0jxtY/qqyQlL92rwMyxfqC9ftVmh95YUrcGGPMMWF8tB9wWTHW8JvAoGAeTmG\nlVmZz7KJbj9LJuDMffjFTvrOww9wctpzDglTbbzoU9nQDav4OmjPHOBUJZdBHfz0\nSAZ/pLw0zm8PPLwDvzP1YZqEEB5VMd+439ZVXtHp2Nk6kENF7u0vYICD64Vpd+hh\ntAm2MNHBiY6BpmZ7A+yWgAzUUZBFUxlrucUSfS0CgYEAreFuzAVnXOFa8IkBT5Wz\nalEQrz9TuiMl6dDjIxPyjk/Z787TuQH/mnHXYo572d4fGP0wvk6/gxQu/NqbwEkI\noO4kPwG7BM/qwdIIFlFJ82aeH4Gae3yu7V+oAITUU+DzKro2N/zx4bAdlyf7F9KV\n3bcNZrdepFhjCCwqDEpll0U=\n-----END PRIVATE KEY-----\n",
            clientEmail: "firebase-adminsdk-120bp@ppersonalapp.iam.gserviceaccount.com",
        }),
    });
} else {
    console.log("✅ Firebase Admin ya estaba inicializado.");
}

const dbAdmin = admin.firestore();
export { dbAdmin };
export default admin;
