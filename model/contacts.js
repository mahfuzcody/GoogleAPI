const { Sequelize, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const contacts = sequelize.define('contacts', {
        first_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        last_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        contacts: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        google_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    }, {
        timestamps: true,
        tableName: 'contacts', // You can specify the table name here
    });

    return contacts;

};

