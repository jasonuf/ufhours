### Dining Hall Hours

Each location object that is a building/section should have is_building = True.  

Overall structure:

location: {
    details,

    week: [
        day: {
            hours: [
                details,
                hours_object: {
                    details
                }
            ]
        }
    ]

}


### Notification strategy

Option for day of or n-days before.

Option to configure only when saved location is closed. Or when hours are different than previous weeks.


### Possible Concerns:

//runtimeValidation
DateSchema allows impossible dates
HoursSchema allows impossible hours/minutes


# Current Dining Error Handling:

If theLocation field is malformed or missing or empty, the Result should have a false ok field,
If any locations within the api response is invalid, it will simply be null within the data array