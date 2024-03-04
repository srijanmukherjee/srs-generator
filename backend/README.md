# Objectives

- Store and retrieve domain information and their corresponding features, informations include

  - Domain details (name, description)
  - Feature + their subfeature list
  - Staff required to implement the feature

- Client submits their list of features and a SRS pdf document is generated

## Data structure

```json
{
    "domains": {
        <key>: {
            _id: <key>,
            "name": string,
            "description": string,
            "features": {
                <key>: {
                    "_id": <key>,
                    "name": string,
                    "description": string,
                    "time_estimate": number,
                    "staff": [<key>],
                    "features": {
                        "_id": <key>,
                        "name": string,
                        "description": string,
                        "time_estimate": number,
                        "staff": [<key>],
                    }
                },
                ...
            }
        }
    },
    "staff": {
        <key>: {
            "_id": <key>,
            "name": string,
            "hourly_rate": number,
        }
    }
}
```

Using [MongoDB](https://www.mongodb.com/) to store the data

## Resources

- https://www.projectmanager.com/blog/cost-estimation-for-projects
