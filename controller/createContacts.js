const { where } = require("sequelize");
const db = require("../model");
const axios = require("axios");
const Contacts = db.contacts;
const accessToken = require('../index');

const syncContacts = async (req, res) => {
    const formData = req.body; // Assume formData is an array of contacts
    const token = req.token;

    // Validate that formData is an array
    if (!Array.isArray(formData)) {
        return res.status(400).json({ error: true, message: "Invalid input data format" });
    }

    try {
        const data1 = await axios.get(`https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers`,

            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        )


        const googleIdsFromData1 = data1.data?.connections?.map(conn => conn.resourceName.split('/')[1]);
        const googleIdSet = new Set(formData?.map(item => item.google_id));
        const filteredIds = googleIdsFromData1?.filter(id => !googleIdSet.has(id));



        if (filteredIds) {
            const deletePromises = filteredIds?.map(id =>
                axios.delete(`https://people.googleapis.com/v1/people/${id}:deleteContact`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(error => ({
                    error: true, message: `Failed to delete contact ${id}`, errorDetail: error.message
                }))
            );

            // Wait for all deletions to complete
            await Promise.all(deletePromises);
        }

        // Use Promise.all to insert all contacts simultaneously
        const results = await Promise.all(
            formData?.map(async (contact) => {

                try {
                    if (!contact.google_id) {
                       
                        const generatedData = generateContactJson(contact);

                        // Make the API request to Google People API to create the contact
                        const responseGoogle = await axios.post(
                            'https://people.googleapis.com/v1/people:createContact',
                            generatedData,
                            {
                                headers: {
                                    'Authorization': `Bearer ${token}`, // Use backticks for template literal
                                    'Content-Type': 'application/json'
                                }
                            }
                        );

                        const resourceName = responseGoogle.data?.resourceName.split('/')[1];

                        await Contacts.update({ google_id: resourceName }, {
                            where: {
                                id: contact.id
                            }
                        })

                        return { error: false, message: "Successfully Created", data: responseGoogle.data };
                    } else {

                        const getTag = await fetch(
                        `https://people.googleapis.com/v1/people/${contact.google_id}?personFields=names,emailAddresses,phoneNumbers`,
                            {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${token}`, // Corrected template literal
                                    'Content-Type': 'application/json'
                                }
                            }
                        );
                        
                        // Parsing the response as JSON
                        const getTagData = await getTag.json();

                        const getStatus=getTagData?.error?.code;
                        
                        console.log("getTagData:", getStatus);

            
                        if(getStatus){

                            const generatedData = generateContactJson(contact);

                            console.log(generatedData);

                        // Make the API request to Google People API to create the contact
                        const responseGoogle = await axios.post(
                            'https://people.googleapis.com/v1/people:createContact',
                            generatedData,
                            {
                                headers: {
                                    'Authorization': `Bearer ${token}`, // Use backticks for template literal
                                    'Content-Type': 'application/json'
                                }
                            }
                        );

                        const resourceName = responseGoogle.data?.resourceName.split('/')[1];

                        await Contacts.update({ google_id: resourceName }, {
                            where: {
                                id: contact.id
                            }
                        })

                        return { error: false, message: "Successfully Created", data: responseGoogle.data }

                        }
                        else{
                       
                    
                        const generateContactUpdate = generateContactJsonUpdate(contact, getTagData.etag);

                        const isUpdateContacts = await axios.patch(
                            `https://people.googleapis.com/v1/people/${contact.google_id}:updateContact?updatePersonFields=names,phoneNumbers,emailAddresses`,
                            generateContactUpdate,
                            {
                                headers: {
                                    'Authorization': `Bearer ${token} `, // Use backticks for template literal
                                    'Content-Type': 'application/json'
                                }
                            }
                        );


                        return { error: false, message: "Successfully Updated", data: isUpdateContacts.data };
                    }
                    }

                } catch (error) {
                    // Handle and return failed contact creation
                    return { error: true, message: "Failed to process contact", contact, errorDetail: error.message };
                }
            })
        );

        // Return the result of all contact operations
        return res.status(200).json({ error: false, results });
    } catch (error) {
        console.error("Error inserting contacts", error);
        // Handle global errors
        return res.status(500).json({ error: true, message: "Internal Server Error", error });
    }
};

const deleteContacts = async (req, res) => {
    const id = req.params.id;
    try { // Check if a super admin is already registered

        // Create the admin
        const newCreated = await Contacts.destroy({
            where: {
                id: id
            }
        });
        if (!newCreated) {
            return res.status(400).json({ error: true, message: "Not Deleted! Try Again" });
        }
        res.status(200).json({ error: false, message: "Deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, message: "Internal Server Error" });
    }
};
const getContacts = async (req, res) => {
    const id = req.params.id;
    try { // Check if a super admin is already registered

        // Create the admin
        const data = await Contacts.findAll();

        if (!data) {
            return res.status(400).json({ error: true, message: "No data found.." });
        }

        res.status(200).json({ error: false, data: data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, message: "Internal Server Error" });
    }
};

const updateContacts = async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    try { // Check if a super admin is already registered

        // Create the admin
        const isExist = await Contacts.findOne({
            where: {
                id: id
            }
        })

        if (!isExist) {
            res.status(204).json({ status: false, message: "no user found" })
        }
        const isUpdate = await Contacts.update(data,
            {
                where: {
                    id: id
                }
            })
        if (!isUpdate) {
            res.status(204).json({ status: false, message: "Contact not update" })
        }
        res.status(200).json({ error: false, message: "Contacts update successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, message: "Internal Server Error" });
    }
};

const extractContactInfo = (data) => {
    const contacts = data.map(connection => {



        return {
            last_name: name.familyName || 'N/A',
            first_name: name.givenName || 'N/A',
            contacts: phone,
            email: email,
            status: 0
        };
    });

    return contacts;
};

function generateContactJson(contact) {
    const contactData = {
        names: [
            {
                givenName: contact.first_name,
                familyName: contact.last_name
            }
        ],
        emailAddresses: [
            {
                value: contact.email
            }
        ],
        phoneNumbers: [
            {
                value: contact.contacts
            }
        ],
    };
    return contactData;
}
function generateContactJsonUpdate(contact, etag) {
    const contactData = {
        etag: etag,
        names: [
            {
                givenName: contact.first_name,
                familyName: contact.last_name
            }
        ],
        emailAddresses: [
            {
                value: contact.email
            }
        ],
        phoneNumbers: [
            {
                value: contact.contacts
            }
        ],
    };
    return contactData;
}

// create database and Google contacts

const createContacts = async (req, res) => {
    const formData = req.body; // Assume formData is an array of contacts
    const token = req.token;

    try {
        const generatedData = generateContactJson(formData);
        const insertdb = await Contacts.create(formData);

        // Make the API request to Google People API to create the contact
        const responseGoogle = await axios.post(
            'https://people.googleapis.com/v1/people:createContact',
            generatedData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`, // Replace with valid token
                    'Content-Type': 'application/json'
                }
            }
        );
        const resourceName = responseGoogle.data?.resourceName.split('/')[1];

        await Contacts.update({ google_id: resourceName }, {
            where: {
                id: insertdb.id
            }
        })
        // All contacts were created successfully
        return res.status(200).json({ error: false, message: "Data Inserted Successfully" });
    } catch (error) {
        console.error("Error inserting contacts", error);
        // Handle global errors
        return res.status(500).json({ error: true, message: "Internal Server Error" });
    }
};

module.exports = { syncContacts, deleteContacts, getContacts, updateContacts, createContacts }