#include <iostream>
#include "userFunction.h"
#include <fstream>
#include <string>
using namespace std;

// TODO : 1. Create a file named userData.txt
// TODO : 2. Write the user information in the file
// TODO : 3. Read the user information from the file and display it on the console

int writeFile(string dataRow, string filename)
{
    ofstream addData("Database/" + filename, ios::app);
    addData << dataRow << endl;
    addData.close();
    return 0;
}
int readFile(string filename)
{
    ifstream readData("Database/" + filename, ios::in);
    string line;
    while (getline(readData, line))
    {
        cout << line << endl;
    }
    readData.close();
    return 0;
}
int createFile(string fileName)
{
    cout << "Please give the parameters for the file (separated by commas): ";
    string parameters;
    getline(cin, parameters);

    ofstream newFile("Database/" + fileName + ".txt", ios::out);
    newFile << parameters << endl;
    newFile.close();
    return 0;
}
// Removed test main() to avoid duplicate symbol when linking with other modules.