const { where } = require("sequelize");
const db = require("../model");
const axios= require("axios");
const Contacts = db.contacts;
const accessToken= require('../index');


const createContacts = async (req, res) => {
    const formData = req.body; // Assume formData is an array of contacts
	const token = req.token;

    // Validate that formData is an array
    if (!Array.isArray(formData)) {
        return res.status(400).json({ error: true, message: "Invalid input data format" });
    }
    try {
        // Use Promise.all to insert all contacts simultaneously
        const insertedContacts = await Promise.all(
            formData.map(async (contact) => {
                try {
                    // Generate JSON data for each contact
                    const generatedData = generateContactJson(contact);
					const insertdb=await Contacts.create(contact);

                    // Make the API request to Google People API to create the contact
                    const responseGoogle = await axios.post(
                        `https://people.googleapis.com/v1/people:createContact`,
                        generatedData,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`, // Replace with valid token
                                'Content-Type': 'application/json'
                            }
                        }
                    );

					const googleId= responseGoogle?.data.metadata.sources[0].id;
					
					await Contacts.update({google_id: googleId},{
						where: {
							id:insertdb.id
						}
					})
                    // Return the successful response from Google
                    return { error: false, message: "successfull",insertdb};

                } catch (error) {
                    console.log("Error creating contact: ", error.message);
                    // Handle and return failed contact creation
                    return { error: true, message: "Failed to create contact", contact, errorDetail: error.message };
                }
            })
        );

        // Separate the failed and successful contacts
        const failedContacts = insertedContacts.filter((result) => result.error);
        const successfulContacts = insertedContacts.filter((result) => !result.error);

        // If there are any failed contacts, return a 207 (multi-status)
        if (failedContacts.length > 0) {
            return res.status(207).json({
                error: true,
                message: "Some contacts failed to be created",
                failedContacts,
                successfulContacts
            });
        }

        // All contacts were created successfully
        return res.status(200).json({ error: false, data: successfulContacts });
    } catch (error) {
        console.error("Error inserting contacts", error);
        // Handle global errors
        return res.status(500).json({ error: true, message: "Internal Server Error" });
    }
};
const deleteContacts = async (req, res) => {
	const id = req.params.id;
	try { // Check if a super admin is already registered

		// Create the admin
		const newCreated = await Contacts.destroy({
			where:{ 
				id: id
			}
		});
		if (! newCreated) {
			return res.status(400).json({error: true, message: "Not Deleted! Try Again"});
		}
		res.status(200).json({error: false, message: "Deleted successfully"});
	} catch (error) {
		console.error(error);
		res.status(500).json({error: true, message: "Internal Server Error"});
	}
};
const getContacts = async (req, res) => {
	const id = req.params.id;
	try { // Check if a super admin is already registered

		// Create the admin
		const data = await Contacts.findAll();
		console.log(data)

		if (! data) {
			return res.status(400).json({error: true, message: "No data found.."});
		}

		res.status(200).json({error: false, data: data});
	} catch (error) {
		console.error(error);
		res.status(500).json({error: true, message: "Internal Server Error"});
	}
};

const updateContacts = async (req, res) => {
	const id = req.params.id;
const data= req.body;

	try { // Check if a super admin is already registered

		// Create the admin
		const isExist= await Contacts.findOne({
			where:{ 
				id: id
			}
		})

		if(!isExist){
			res.status(204).json({status: false, message: "no user found"})
		}
		const isUpdate= await Contacts.update(data,
			{
			where:{ 
				id: id
			}
		})
		if(!isUpdate){
			res.status(204).json({status: false, message: "Contact not update"})
		}
		res.status(200).json({error: false, message: "Contacts update successfully"});
	} catch (error) {
		console.error(error);
		res.status(500).json({error: true, message: "Internal Server Error"});
	}
};

const extractContactInfo = (data) => {
    const contacts = data.map(connection => {

      
  
      return {
        last_name: name.familyName || 'N/A',
        first_name: name.givenName || 'N/A',
        contacts: phone,
        email: email,
        status:0
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

module.exports= {createContacts , deleteContacts, getContacts,updateContacts}